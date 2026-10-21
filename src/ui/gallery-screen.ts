// 图库屏幕（Vue 深模块）——WET 自 WeebPaint src/gallery/gallery.ts v0.14.9（C 骑士轮「UI 深化 candidate 1」），2026-09-09 包化。
// 变化只在接缝（提案 §3「塑」）：Vue 从 deps.vue 注入；session.* 十处 → DocHost；文件动词 → core/verbs；数据 → core/data-face；
//   缩略图 / 加密 / 图标 / 文案 / 诊断 全走注入；宿主布局知识（当前夹记忆、图库模式判定）走 deps。模板与 class 名逐字保留。
import { toggleAdoptedPopup, type PopupMenuHandle } from "@internal/workbench-elements";
import type { SyncState } from "@internal/store";
import type { GItem } from "../core/model/gallery-view-model.ts";
import { tileFor, breadcrumb, asideTileFor, humanTime, humanSize, fullTime, hasLocalCopy } from "../core/model/gallery-view-model.ts";
import { ASIDE, type AsideItem, type AsideKind, type AsideScope } from "../core/model/aside.ts";
import { pathJoin } from "../core/model/gallery-path.ts";
import { imageThumbToken, imageTwinIdentifier, mimeForImageName } from "../core/model/cloud-image-model.ts";
import { createFrameGate } from "../core/guards/frame-gate.ts";
import { createFirstFrameWatchdog } from "../core/guards/first-frame-watchdog.ts";
import { note as diagNote } from "../core/guards/diag-log.ts";
import type { GalleryDataFace, GallerySnapshot, CloudImageItem } from "../core/data-face.ts";
import { createGalleryVerbs, type VerbHost, type VerbDoc, type VerbStore, type VerbEncryption } from "../core/verbs.ts";
import type { ThumbCache } from "../core/thumbs/thumb-cache.ts";
import type { FactsCache } from "../core/facts/facts-cache.ts";
import { t } from "../core/text.ts";
import { isPng, readPngText, PNG_BLURB_KEYWORD } from "../core/thumbs/png-text.ts";
import { THUMB_CELL_TEMPLATE, IMAGE_THUMB_CELL_TEMPLATE, GALLERY_TEMPLATE } from "./templates.ts";
import * as COMPILED from "./templates.compiled.ts";

/** 宿主 vendored 的 Vue prod ESM（提案 §7.1 决定 (a)）。 */
/** 0.6.4：宿主画封面 / 占位时拿到的卡片信息（tileOverlayHtml / tilePlaceholderHtml 的第二参）。
 *  文件卡 = GItem 的字段；搁置区（回收站 / 备份箱）卡 = 从 AsideItem 映射：at → lastModified、box → aside；没有 size、没有 syncState。 */
export interface TileInfo {
  identifier: string;
  stem: string;
  /** 文档种类（store docKinds 表的 kind）；搁置区里不是文档的条目 → null。 */
  kind: string | null;
  syncState?: SyncState;
  size?: number;
  lastModified?: number;
  /** 在回收站 / 备份箱里的卡片才有。 */
  aside?: AsideKind;
}
/** 宿主递进来的 Vue。**递整个模块**（`import * as Vue from ".../vue.esm-browser.prod.js"` 原样递）= 用构建时编好的 render 函数、运行时零 eval（页面开了 CSP 也能开）；
 *  只递下面这几个也能用（0.8.3 及以前的递法），但模板要在运行时编译、需要 eval。0.8.4 */
export interface VueRuntime {
  createApp: (root: unknown) => { mount(el: HTMLElement): unknown; unmount(): void };
  /** Vue 的 Teleport 组件（0.6.2：卡片 ⋯ 菜单传送出卡片，进宿主的菜单 band；宿主把 vue 模块里的 Teleport 原样递进来）。 */
  Teleport: unknown;
  defineComponent: (o: unknown) => unknown;
  reactive: <T extends object>(o: T) => T;
  ref: <T>(v: T) => { value: T };
  computed: <T>(fn: () => T) => { value: T };
  watch: (src: () => unknown, cb: () => void) => void;
  onMounted: (fn: () => void) => void;
  onUnmounted: (fn: () => void) => void;
  nextTick: (fn?: () => void) => Promise<void>;
}
/** 图库对编辑器的全部要求（提案 §2 DocHost；WeebPaint session-state 的十处直调收成这一个端口）。 */
/** 0.8.0：卡片右下角那粒动作钮长什么样（宿主按卡片信息 + 事实决定）；null = 这张卡没有钮。state：ready = 亮；none = 不画（和 null 一样，留给「事实已到、确定没有」）；unknown = 淡（事实还没到）。 */
export interface TileAction { icon: string; title: string; state?: "ready" | "none" | "unknown" }
export interface GalleryDocHost extends VerbDoc {
  open(item: GItem): Promise<void>;
  /** 0.8.0：点了卡片上的动作钮（不打开那份）。facts = 这张卡的事实（policy.facts 取的；没取到 = null）。 */
  tileAction?(item: GItem, facts: unknown): void | Promise<void>;
  /** 图片 tile 孪生语义（WeebPaint）：把图片字节转生成新文档；不实现 = 图片 tile 只显示不可开。 */
  importImageAsDoc?(file: File, opts: { nameOverride: string }): Promise<void>;
}
export interface GalleryEncryption extends VerbEncryption {
  isUnlocked(): boolean;
  onLockChange(cb: (unlocked: boolean) => void): void;
  isEncryptedPeekBlob(b: Blob): boolean;
  localPeekThumb(name: string): Promise<Blob | null>;
  decryptCloudPeekThumb(name: string, enc: Blob): Promise<Blob | null>;
  /** 本地字节是不是加密容器（纯本地读文件头，无网络）。 */
  isEncrypted(name: string): Promise<boolean>;
}
export interface GalleryScreenDeps {
  vue: VueRuntime;
  store: () => VerbStore | null;                 // null = 无库模式（空网格，不订阅）
  data: GalleryDataFace;
  doc: GalleryDocHost;
  host: VerbHost;
  ui: {
    iconHtml: (name: string, opts?: { size?: number; cls?: string }) => string;
    /** 0.1.2：无缩略图时卡片占位内容（HTML，通常是一枚图标）。不给 → 退回名字首字（WeebPaint 默认；WXHW 2026-09-10 user「所有的预览图都是 2……不要从名字生成」→ 宿主给 book/file 图标）。
     *  0.6.4：第二参 = 卡片信息（大小 / 修改时间 / 种类 / 在哪个箱子），可选、向后兼容。 */
    tilePlaceholderHtml?: (name: string, info?: TileInfo) => string | undefined;
    /** 0.5.0：盖在文档卡片封面上的一层宿主内容（HTML）。**有没有缩略图都画**——缩略图只是背景
     *  （WXHW 2026-09-29 user「字的逻辑一样，无视是否有图，图只是背景」）。文件 / 回收站 / 备份箱的卡片都走它；文件夹、图片、杂物卡片不走。
     *  包只给一个铺满封面、不吃指针事件的槽（`.gallery-tile-overlay`，紧跟在缩略图元素后面，宿主 CSS 可以用相邻选择器区分底下是图还是占位），
     *  里面画什么、怎么排版全归宿主；包不因为有没有这一层改变任何别的行为。列表布局不画。不给 / 返回空 = 不画。
     *  0.6.4：第二参 = 卡片信息（WXHW 2026-09-30 user「左边是 yyyymmdd，右边是 size」要在封面上印大小），可选、向后兼容。 */
    tileOverlayHtml?: (name: string, info?: TileInfo, facts?: unknown) => string | undefined;
    /** 0.8.0：卡片右下角一粒动作钮（有正式的位置和指针事件，不盖同步徽章；点了走 doc.tileAction，不打开那份）。facts = policy.facts 取到的事实（没取到 = null）；
     *  事实到了会重算（响应式）。文件卡才有；搁置区 / 列表布局不画。 */
    tileAction?: (name: string, info: TileInfo, facts: unknown) => TileAction | null;
  };
  /** 卡片比例 = 宽 ÷ 高，一个数。不给 = 1（方图，WeebPaint 默认）；别的比例宿主自己给（WXHW 书库 1/√2、JRB 2/3）。竖版（< 1）自动用更密的排法：卡片窄一档、窄屏一排三张。
   *  （0.2.0–0.6.x 是闭集 "1/1" | "2/3"；user 2026-10-01「改成只支持默认1:1和自定义可以吗」——包不该认识某一个具体的书封比例。）
   *  0.3.0（JRB 第三消费者，提案 ai-docs/20260919-proposal-list-view.md）：layout "list" = 一行一件、名字整行（最多折两行不截断）、副标题一行、右侧 ⋯；
   *  subtitle / marker = 宿主 hook（JRB：状态头 / 未读点）。全部可选，不给 = 0.2.2 行为。 */
  tile?: {
    aspect?: number;
    layout?: "cards" | "list";
    subtitle?: (item: GItem) => string | null | undefined;
    marker?: (item: GItem) => "unread" | null | undefined;
  };
  /** 0.6.0（原 0.2.1 hasThumb）：哪几个文档种类有缩略图（docKinds 的 kind）。createGallery 从 policy.thumbs.kinds 填；空 = 都没有。
   *  没有缩略图的种类不去尾读、加密件不显锁图标（WXHW 的 txt 稿）。 */
  thumbKinds?: readonly string[];
  thumbs?: ThumbCache;
  /** 0.8.0：卡片的「事实」（createGallery 从 policy.facts 填）：哪几个种类取、缓存在哪。 */
  factsKinds?: readonly string[];
  facts?: FactsCache;
  imageThumbs?: { getOrFetch(path: string, token: string): Promise<Blob> };
  encryption?: GalleryEncryption;
  /** 「上次在哪个夹」的记忆（WeebPaint = synced collection appState.currentDirectory）；不给 = 只记内存。 */
  folderMemory?: { get(): string; set(p: string): void };
  /** 手指按住不重绘的门只在图库可见时持（WeebPaint: body[data-mode=gallery]）；不给 = 恒真。 */
  isGalleryVisible?: () => boolean;
  reportError: (err: unknown, level?: "error" | "warning" | "info" | "log") => void;
  openDiag?: () => void;
  reloadApp?: () => void;
}

/** 图库一屏能开的视图：文件 + 两个搁置区（回收站 / 备份箱，0.5.0）。 */
export type GalleryView = "files" | AsideKind;
export interface GalleryHandle {
  refresh(): void;
  setView(v: GalleryView): void;
  getView(): GalleryView;
  setFolder(path: string): void;
  hydrateFolder(path: string): void;
  getFolder(): string;
  /** 清空回收站（只清回收站，和当前开着哪个视图无关）。 */
  emptyTrash(scope?: AsideScope): void;
  /** 0.5.0：清空备份箱（只清备份箱，和当前开着哪个视图无关）。 */
  emptyBackup(scope?: AsideScope): void;
  requestUnlock(): Promise<boolean>;
  invalidateEncrypted(name: string): void;
  /** 0.3.0：布局即时切换（用户偏好记不记住归宿主）。 */
  setLayout(l: "cards" | "list"): void;
  getLayout(): "cards" | "list";
  unmount(): void;
}
interface GalleryVM {
  reload(): void; setView(v: GalleryView): void; view: GalleryView;
  setFolder(p: string): void; hydrateFolder(p: string): void; folder: string;
  emptyAside(kind: AsideKind, scope?: AsideScope): void; requestUnlock(): Promise<boolean>; invalidateEncrypted(name: string): void;
  layout: "cards" | "list"; setLayout(l: "cards" | "list"): void;
}
const PIXELATED_THUMB_MAX_EDGE = 128;
function thumbLoadPixelated(e: Event): boolean {
  const img = e.target as HTMLImageElement; const edge = Math.max(img.naturalWidth, img.naturalHeight);
  return edge > 0 && edge < PIXELATED_THUMB_MAX_EDGE;
}
export function mountGalleryScreen(el: HTMLElement, d: GalleryScreenDeps): GalleryHandle {
  const { createApp, defineComponent, reactive, ref, computed, watch, onMounted, onUnmounted, nextTick } = d.vue;
  // 0.8.4：宿主递了整个 Vue 模块（render 要的 helper 都在）→ 用构建时编好的 render 函数，运行时不编译模板（宿主开了 CSP、不放行 eval 也能开）；
  //   只递了老的那几个 → 照旧给模板、运行时编译（要 eval），并在黑匣子记一笔。Claude Opus 5.5 2026-10-17
  const vueAll = d.vue as unknown as Record<string, unknown>;
  const precompiled = COMPILED.HELPERS.every((h) => vueAll[h] != null);
  if (!precompiled) diagNote("gallery", "host passed a partial Vue runtime: templates compile at runtime (needs eval; blocked by a strict CSP)");
  const RENDERS = { thumbCell: COMPILED.thumbCellRender, imageThumbCell: COMPILED.imageThumbCellRender, gallery: COMPILED.galleryRender } as const;
  const tpl = (which: keyof typeof RENDERS, template: string): { render: unknown } | { template: string } => (precompiled ? { render: RENDERS[which](d.vue) } : { template });
  const icon = d.ui.iconHtml;
  const phHtml = (name: string, info?: TileInfo): string => d.ui.tilePlaceholderHtml?.(name, info) ?? "";   // 0.1.2：宿主给的占位图标；空 = 退回名字首字
  const ovHtml = (name: string, info?: TileInfo, facts: unknown = null): string => { try { return d.ui.tileOverlayHtml?.(name, info, facts) ?? ""; } catch { return ""; } };   // 0.5.0：宿主盖在封面上的一层（0.8.0 多一个 facts）
  const actionOf = (name: string, info: TileInfo, facts: unknown): TileAction | null => { try { const a = d.ui.tileAction?.(name, info, facts) ?? null; return a && a.state !== "none" ? a : null; } catch { return null; } };   // 0.8.0
  // 0.6.4：宿主画封面 / 占位时拿到的卡片信息。文件卡 = GItem 本尊的字段；搁置区卡从 AsideItem 映射（at → lastModified；没有 size）。
  const fileInfo = (it: GItem): TileInfo => ({ identifier: it.identifier, stem: it.stem, kind: it.kind, syncState: it.syncState, size: it.size, lastModified: it.lastModified });
  const asideInfo = (it: AsideItem): TileInfo => ({ identifier: it.identifier, stem: it.stem, kind: it.kind, lastModified: it.at || undefined, aside: it.box });
  const thumbKinds = new Set(d.thumbKinds ?? []);
  const hasThumb = (kind: string | null): boolean => kind != null && thumbKinds.has(kind);
  const ICON = {
    localOnly: icon("database"), cloudOnly: icon("cloud"), syncedBoth: icon("cloud-synced"), dirtyBoth: icon("cloud-upload"),
    float: icon("cloud-upload"), folder: icon("folder"), cloudBig: icon("cloud"),
    ghost: icon("cloud-unavailable"), pendingGone: icon("cloud-pending"), newerOnCloud: icon("cloud-download"), conflictBoth: icon("cloud-conflict"),
    lock: icon("lock"), image: icon("image"), file: icon("file"),
  };
  const enc = d.encryption;
  const _lockState = reactive({ unlocked: enc?.isUnlocked() ?? true });
  enc?.onLockChange((u) => { _lockState.unlocked = u; });
  const _thumbRev = reactive(new Map<string, number>());
  d.thumbs?.onInvalidated((key) => { _thumbRev.set(key, (_thumbRev.get(key) ?? 0) + 1); });
  const thumbKey = (identifier: string) => identifier;
  // 0.8.0 事实：身份 → { token, value }（响应式；到了卡片自己重算）。取法同缩略图：按 token 命中缓存、没有就去取（并发限 3），取不到 = 留空、下次再问；invalidate = 清掉重取
  const factsKinds = new Set(d.factsKinds ?? []);
  const _facts = reactive(new Map<string, { token: string; value: unknown }>());
  const _factsInflight = new Set<string>();
  let _factsRunning = 0; const _factsWaiting: (() => void)[] = []; const FACTS_PAR = 3;
  d.facts?.onInvalidated((key) => { _facts.delete(key); });
  function wantFacts(identifier: string, kind: string | null, token: string, source: "local" | "cloud"): void {
    if (!d.facts || kind == null || !factsKinds.has(kind)) return;
    const have = _facts.get(identifier); if (have && have.token === token) return;
    if (_factsInflight.has(identifier)) return;
    _factsInflight.add(identifier);
    const go = () => {
      _factsRunning++;
      d.facts!.getOrFetch(identifier, token, source)
        .then(({ value }) => { _facts.set(identifier, { token, value }); })
        .catch((err: unknown) => d.reportError(new Error("[gallery] facts: " + String(err)), "log"))
        .finally(() => { _factsInflight.delete(identifier); _factsRunning--; _factsWaiting.shift()?.(); });
    };
    if (_factsRunning < FACTS_PAR) go(); else _factsWaiting.push(go);
  }
  const factsOf = (identifier: string): unknown => _facts.get(identifier)?.value ?? null;

  const ThumbCell = defineComponent({
    name: "ThumbCell",
    props: { encName: { type: String, default: null }, fetchable: { type: Boolean, default: false }, isCloud: { type: Boolean, default: false }, cloudNewer: { type: Boolean, default: false }, thumbToken: { type: String, default: "" }, fallback: { type: String, default: "?" }, fallbackHtml: { type: String, default: "" }, alt: { type: String, default: "" } },
    emits: ["unlock"],
    setup(props: { encName: string | null; fetchable: boolean; isCloud: boolean; cloudNewer: boolean; thumbToken: string; fallback: string; fallbackHtml: string; alt: string }) {
      const url = ref<string | null>(null), showCloud = ref(false), locked = ref(false), root = ref<HTMLElement | null>(null);
      let cloudEncBlob: Blob | null = null, objUrl: string | null = null, obs: IntersectionObserver | null = null;
      const blurb = ref("");
      // 0.2.0：缩略图 PNG 自带的 Description 文本块 = 腰封 / caption → 悬停 tooltip（user 2026-09-10「thumbnail.png 的标准 tEXt 文本块…gallery 库的公共行为」）
      const readBlurb = (blob: Blob) => { void blob.arrayBuffer().then((ab) => { const u8 = new Uint8Array(ab); blurb.value = isPng(u8) ? (readPngText(u8)[PNG_BLURB_KEYWORD] ?? "") : ""; }).catch(() => { blurb.value = ""; }); };
      const setBlob = (blob: Blob) => { if (objUrl) URL.revokeObjectURL(objUrl); objUrl = URL.createObjectURL(blob); url.value = objUrl; readBlurb(blob); };
      const tryDecrypt = async () => {
        if (!enc) { locked.value = true; return; }
        let png: Blob | null = null;
        if (props.encName) png = await enc.localPeekThumb(props.encName);
        else if (cloudEncBlob) png = await enc.decryptCloudPeekThumb(props.alt, cloudEncBlob);
        if (png && png.size > 0) { locked.value = false; setBlob(png); }
        else if (enc.isUnlocked()) locked.value = false;   // 0.2.1：解锁了但这本没封面 → 占位图标，不是锁（锁只表示「解不开」）
        else locked.value = true;
      };
      let fetchSeq = 0;
      const fetchThumb = () => {
        if (!d.thumbs) return;   // 无缩略图政策（WXHW 2.0）→ 保持占位
        const seq = ++fetchSeq;
        d.thumbs.getOrFetch(props.alt, props.thumbToken, props.cloudNewer ? "cloud" : "local")
          .then(({ blob }) => { if (seq !== fetchSeq) return; showCloud.value = false; if (!blob) return; /* 0.2.2：确定没缩略图 → 占位图标（书），不是云 */ if (enc?.isEncryptedPeekBlob(blob)) { cloudEncBlob = blob; return tryDecrypt(); } setBlob(blob); })
          .catch((err: unknown) => d.reportError(new Error("[gallery] thumb: " + String(err)), "log"));
      };
      onMounted(() => {
        if (props.encName) { void tryDecrypt(); return; }
        if (props.fetchable && d.thumbs) {
          if (props.isCloud) showCloud.value = true;
          obs = new IntersectionObserver((entries) => { for (const e of entries) { if (!e.isIntersecting) continue; obs?.disconnect(); obs = null; fetchThumb(); } }, { rootMargin: "600px 0px", threshold: 0.01 });
          void nextTick(() => { if (obs && root.value) obs.observe(root.value); });
        }
      });
      watch(() => _lockState.unlocked, () => { if (locked.value || props.encName) void tryDecrypt(); });
      watch(() => [props.thumbToken, props.cloudNewer, _thumbRev.get(thumbKey(props.alt)) ?? 0], () => {
        if (props.encName) { void tryDecrypt(); return; }
        if (!props.fetchable || obs) return;
        fetchThumb();
      });
      onUnmounted(() => { obs?.disconnect(); if (objUrl) URL.revokeObjectURL(objUrl); });
      const pixelated = ref(false);
      const onThumbLoad = (e: Event) => { pixelated.value = thumbLoadPixelated(e); };
      return { url, showCloud, locked, root, ICON, lockedTitle: t("gal.lockedThumb"), pixelated, onThumbLoad, blurb };
    },
    ...tpl("thumbCell", THUMB_CELL_TEMPLATE),
  });

  const ImageThumbCell = defineComponent({
    name: "ImageThumbCell",
    props: { identifier: { type: String, required: true }, token: { type: String, default: "" }, fallback: { type: String, default: "?" }, alt: { type: String, default: "" } },
    setup(props: { identifier: string; token: string; fallback: string; alt: string }) {
      const url = ref<string | null>(null), root = ref<HTMLElement | null>(null);
      let objUrl: string | null = null, obs: IntersectionObserver | null = null, fetchSeq = 0;
      const fetchThumb = () => {
        if (!d.imageThumbs) return;
        const seq = ++fetchSeq;
        d.imageThumbs.getOrFetch(props.identifier, props.token)
          .then((blob) => { if (seq !== fetchSeq) return; if (objUrl) URL.revokeObjectURL(objUrl); objUrl = URL.createObjectURL(blob); url.value = objUrl; })
          .catch((err: unknown) => d.reportError(new Error("[gallery] image thumb: " + String(err)), "log"));
      };
      onMounted(() => {
        if (!d.imageThumbs) return;
        obs = new IntersectionObserver((entries) => { for (const e of entries) { if (!e.isIntersecting) continue; obs?.disconnect(); obs = null; fetchThumb(); } }, { rootMargin: "600px 0px", threshold: 0.01 });
        void nextTick(() => { if (obs && root.value) obs.observe(root.value); });
      });
      watch(() => props.token, () => { if (!obs) fetchThumb(); });
      onUnmounted(() => { obs?.disconnect(); if (objUrl) URL.revokeObjectURL(objUrl); });
      const pixelated = ref(false);
      const onThumbLoad = (e: Event) => { pixelated.value = thumbLoadPixelated(e); };
      return { url, root, pixelated, onThumbLoad };
    },
    ...tpl("imageThumbCell", IMAGE_THUMB_CELL_TEMPLATE),
  });

  const Gallery = defineComponent({
    name: "Gallery",
    components: { ThumbCell, ImageThumbCell, Teleport: d.vue.Teleport },
    setup() {
      const view = ref<GalleryView>("files");
      const layout = ref<"cards" | "list">(d.tile?.layout ?? "cards");
      const subtitleOf = (item: GItem): string => { try { return d.tile?.subtitle?.(item) ?? ""; } catch { return ""; } };
      const markerOf = (item: GItem): "unread" | null => { try { return d.tile?.marker?.(item) ?? null; } catch { return null; } };
      const folder = ref<string>(safeFolder());
      const loading = ref(false);
      const data = reactive<{ files: GItem[]; images: CloudImageItem[]; others: GallerySnapshot["others"]; folderNames: string[] }>({ files: [], images: [], others: [], folderNames: [] });
      const aside = ref<AsideItem[]>([]);   // 当前开着的那个搁置区的列表（回收站 / 备份箱）
      const openMenu = ref<string | null>(null);
      function safeFolder() { try { return d.folderMemory?.get() || ""; } catch { return ""; } }

      let _unsub: (() => void) | null = null, _framedFolder: string | null = null, _awaitingFirst = false, _subscribedAt = 0;
      function applyFrame(snap: GallerySnapshot) {
        if (view.value !== "files" || snap.folder !== folder.value) return;
        data.files = snap.items; data.images = snap.images; data.others = snap.others; data.folderNames = snap.folderNames;
        _framedFolder = snap.folder; loading.value = false;
        wd.frame(snap.folder);
        if (stalled.value) stalled.value = null;
        if (_awaitingFirst) { _awaitingFirst = false; diagNote("gallery", `first frame folder="${snap.folder}" items=${snap.items.length} folders=${snap.folderNames.length} in ${Math.round(performance.now() - _subscribedAt)}ms`); }
        void probeEncrypted();
      }
      const gate = createFrameGate<GallerySnapshot>(applyFrame);
      const stalled = ref<string | null>(null);
      const wd = createFirstFrameWatchdog(({ folder: f, elapsedMs }) => {
        if (!loading.value) return;
        stalled.value = t("gal.firstFrameTimeout");
        const standalone = typeof matchMedia === "function" ? matchMedia("(display-mode: standalone)").matches : false;
        d.reportError(new Error(`[gallery] first frame timeout: folder="${f}" after ${elapsedMs}ms (store listing did not respond — IDB wedged?) visibility=${document.visibilityState} online=${navigator.onLine} standalone=${standalone}`), "warning");
      }, { timeoutMs: 8000 });
      function onFrameError(err: unknown, phase: "local" | "remote"): void {
        diagNote("gallery", `frame error phase=${phase} folder="${folder.value}" loading=${loading.value}: ${String(err)}`);
        if (phase === "local" && loading.value) { wd.cancel(); stalled.value = t("gal.firstFrameFailed"); }
      }
      function retry(): void { diagNote("gallery", `retry view=${view.value} folder="${folder.value}"`); stalled.value = null; _framedFolder = null; void reload(); }
      function openDiag(): void { diagNote("gallery", "open diag log from stalled grid"); d.openDiag?.(); }
      function reloadApp(): void { diagNote("gallery", `reload from stalled grid folder="${folder.value}"`); if (d.reloadApp) d.reloadApp(); else location.reload(); }
      function subscribe() {
        _unsub?.(); _unsub = null;
        if (view.value !== "files") return;
        if (!d.store()) { data.files = []; data.images = []; data.others = []; data.folderNames = []; loading.value = false; wd.cancel(); stalled.value = null; return; }   // 无库：不订阅、空网格
        loading.value = _framedFolder !== folder.value;
        stalled.value = null;
        _awaitingFirst = true; _subscribedAt = performance.now();
        if (loading.value) wd.arm(folder.value); else wd.cancel();
        diagNote("gallery", `subscribe folder="${folder.value}" loading=${loading.value}`);
        _unsub = d.data.watchFolder(folder.value, (snap) => { if (snap.folder !== folder.value) return; if (loading.value) applyFrame(snap); else gate.push(snap); }, { onError: onFrameError });
      }
      const isVisible = d.isGalleryVisible ?? (() => true);
      const _onGatePtrDown = () => { if (isVisible()) gate.pointerDown(); };
      const _onGatePtrUp = () => gate.pointerUp();
      document.addEventListener("pointerdown", _onGatePtrDown, true);
      document.addEventListener("pointerup", _onGatePtrUp, true);
      document.addEventListener("pointercancel", _onGatePtrUp, true);

      const encByName = reactive<Record<string, boolean>>({});
      async function probeEncrypted() {
        if (!enc) return;
        for (const nm of data.files.filter((it) => hasLocalCopy(it.syncState)).map((it) => it.identifier)) {
          if (nm in encByName) continue;
          try { encByName[nm] = await enc.isEncrypted(nm); } catch { encByName[nm] = false; }
        }
      }
      function invalidateEncrypted(name: string) { delete encByName[name]; void probeEncrypted(); }
      async function requestUnlock(): Promise<boolean> {
        await probeEncrypted();
        for (const it of data.files) { if (!hasLocalCopy(it.syncState) || !encByName[it.identifier]) continue; return await verbs.unlock(it.identifier); }
        return false;
      }
      // 搁置区列表：一次性读（不订阅）。序号守卫：连点切换视图时，晚到的旧结果不许盖掉新视图。
      //   读失败 = 留在「读取失败 + 重试」那一块，**不装成空列表**（空的备份箱和读不出来的备份箱不是一回事）。
      let _asideSeq = 0;
      async function loadAside(kind: AsideKind) {
        const seq = ++_asideSeq;
        wd.cancel(); stalled.value = null; aside.value = [];
        if (!d.store()) { loading.value = false; return; }   // 无库：空
        loading.value = true;
        try {
          const rows = await d.data.listAside(kind);
          if (seq !== _asideSeq || view.value !== kind) return;
          aside.value = rows; loading.value = false;
        } catch (e: unknown) {
          if (seq !== _asideSeq || view.value !== kind) return;
          diagNote("gallery", `aside listing failed kind=${kind}: ${String(e)}`);
          d.reportError(new Error(`[gallery] ${kind} listing failed: ${String((e as { message?: unknown })?.message || e)}`), "warning");
          stalled.value = t("gal.firstFrameFailed");
        }
      }
      async function reload() { closeMenu(); const v = view.value; if (v === "files") { _asideSeq++; subscribe(); } else { _unsub?.(); _unsub = null; await loadAside(v); } }
      function setFolder(p: string) { folder.value = p || ""; try { d.folderMemory?.set(folder.value); } catch { /* noop */ } closeMenu(); subscribe(); }
      function hydrateFolder(p: string) { if ((p || "") === folder.value) return; folder.value = p || ""; closeMenu(); subscribe(); }
      subscribe();
      onUnmounted(() => {
        _unsub?.(); _unsub = null; wd.cancel(); gate.reset();
        document.removeEventListener("pointerdown", _onGatePtrDown, true);
        document.removeEventListener("pointerup", _onGatePtrUp, true);
        document.removeEventListener("pointercancel", _onGatePtrUp, true);
      });

      const folderTiles = computed(() => data.folderNames.map((fn) => ({ name: fn, path: pathJoin(folder.value, fn) })));
      const fileTiles = computed(() => data.files.map((it) => { const tile = tileFor(it, { signedIn: d.host.signedIn(), activeIdentifier: d.host.activeIdentifier(), encrypted: !!encByName[it.identifier] }); const info = fileInfo(it), facts = factsOf(it.identifier); return { item: it, t: tile, sub: subtitleOf(it), marker: markerOf(it), ov: ovHtml(it.identifier, info, facts), thumb: hasThumb(it.kind), info, facts, act: actionOf(it.identifier, info, facts) }; }));
      // 0.8.0：列表一变就把该取的事实排上（加密件不取：尾读到的是密文）；事实到了 _facts 变 → fileTiles 重算 → 钮 / 覆盖层跟着
      const askFacts = () => { if (!d.facts) return; for (const r of fileTiles.value) if (!r.t.encrypted && (r.t.hasCloud || r.t.hasLocal)) wantFacts(r.t.identifier, r.item.kind, String(r.t.time || r.t.size || 0), r.t.cloudNewer ? "cloud" : "local"); };
      watch(() => fileTiles.value, askFacts); askFacts();
      // 搁置区卡片：取不取缩略图、时间后面跟哪个词，按 item 自带的 kind 查 ASIDE 表
      const asideTiles = computed(() => aside.value.map((it) => ({ item: it, t: asideTileFor(it), fetch: ASIDE[it.box].thumb === "by-name" && hasThumb(it.kind), atWord: t(ASIDE[it.box].text.at), ov: it.kind != null ? ovHtml(it.identifier, asideInfo(it)) : "", info: asideInfo(it) })));
      const imageTiles = computed(() => data.images.map((im) => ({ raw: im, identifier: im.identifier, label: im.label, size: im.size || 0, time: im.lastModified || 0, token: imageThumbToken(im) })));
      const otherTiles = computed(() => data.others.map((o) => ({ identifier: o.identifier, label: o.label, size: o.size || 0, time: o.lastModified || 0 })));
      const crumbs = computed(() => breadcrumb(folder.value));
      const isEmpty = computed(() => view.value !== "files" ? asideTiles.value.length === 0 : folderTiles.value.length === 0 && fileTiles.value.length === 0 && imageTiles.value.length === 0 && otherTiles.value.length === 0);
      const emptyText = computed(() => view.value !== "files" ? t(ASIDE[view.value].text.none) : folder.value ? t("gal.empty.folder", { f: folder.value }) : t("gal.empty.none"));
      const badgeIcon = (k: string) => (ICON as Record<string, string>)[k] || "";
      const badgeIcon2 = (k: string) => { try { return icon(k); } catch { return ""; } };   // 0.8.0：动作钮的图标走宿主的 iconHtml（宿主 sprite 里的名字）
      const fmtMeta = (x: { time: number; size: number }) => `${humanTime(x.time)} · ${humanSize(x.size)}`;

      // ── 卡片 ⋯ 菜单（0.6.2）：以前是卡片里的 absolute + z-index 5。卡片 :hover 带 transform，iOS 上点一下 hover 会粘住 → 卡片自成层叠上下文 →
      //   菜单的 z 只在卡片里算，后面的卡片按 DOM 顺序盖上来（WXHW 真机 2026-09-30）。任何 transform / filter / opacity / contain 出现在卡片或其祖先上都会再犯。
      //   根治 = 菜单不住卡片里：节点由 Vue <Teleport> 搬到图库挂载点（Vue 自己的 DOM 归 Vue 管，别让别人 appendChild），
      //   生命周期 / 定位 / 外点关 / Escape / 栈 / 滚动收 全交给 @internal/workbench-elements 的 popup-menu 深模块（收养 adapter：
      //   它的头注释点名「图库三 popup」就该这么走）；z 走 gallery.css 的 var(--z-menu)（band 表归宿主 :root）。
      let menuHandle: PopupMenuHandle | null = null;
      const closeMenu = () => { menuHandle?.close(); };
      const toggleMenu = (key: string, ev: Event) => {
        const btn = ev.currentTarget as HTMLElement;
        const popup = [...el.querySelectorAll<HTMLElement>(".gallery-tile-menu-popup")].find((x) => x.dataset.menu === key);
        if (!popup) return;
        const h = toggleAdoptedPopup(popup, { anchor: btn, align: "right", band: "css", position: "anchor", onClose: () => { if (menuHandle?.el === popup) { menuHandle = null; openMenu.value = null; } } });
        menuHandle = h; openMenu.value = h ? key : null;
      };
      onUnmounted(closeMenu);

      // ── 动词：core/verbs（红线兜底在那边）；这里只包 openMenu 收起 + reload ──
      const verbs = createGalleryVerbs({ store: () => { const s = d.store(); if (!s) throw new Error("gallery: no library attached"); return s; }, host: d.host, doc: d.doc, thumbs: d.thumbs, onEncryptionChanged: invalidateEncrypted, encryption: enc });
      const wrap = <A extends unknown[]>(fn: (...a: A) => Promise<void>) => async (...a: A) => { closeMenu(); await fn(...a); await reload(); };
      const rename = wrap((item: GItem) => verbs.rename(item));
      const move = wrap((item: GItem) => verbs.move(item, { folder: folder.value, folderNames: data.folderNames }));
      const copy = wrap((item: GItem) => verbs.copy(item, data.files.map((it) => it.identifier)));
      const resolve = wrap((item: GItem) => verbs.resolve(item));   // 0.7.2：没同步好的唯一动作（库问人三选一）
      const unload = wrap((item: GItem) => verbs.unload(item));
      const keepOffline = wrap((item: GItem) => verbs.keepOffline(item));
      const del = wrap((item: GItem) => verbs.del(item));
      const deleteImage = wrap((img: CloudImageItem) => verbs.deleteImage(img));
      const folderDelete = wrap((ft: { name: string; path: string }) => verbs.folderDelete(ft));
      const asideRestore = wrap((item: AsideItem) => verbs.asideRestore(item));
      const asidePurge = wrap((item: AsideItem) => verbs.asidePurge(item));
      const emptyAside = async (kind: AsideKind, scope: AsideScope = "both") => { await verbs.emptyAside(kind, scope); await reload(); };
      const encryptItem = wrap((item: GItem) => verbs.encryptItem(item));
      const decryptItem = wrap((item: GItem) => verbs.decryptItem(item));
      async function onUnlock(name: string) { if (await verbs.unlock(name)) await reload(); }

      /** 0.8.0：卡片上的动作钮（不打开那份）。 */
      function tileAction(item: GItem) { try { void Promise.resolve(d.doc.tileAction?.(item, factsOf(item.identifier))).catch((e: unknown) => d.reportError(e)); } catch (e) { d.reportError(e); } }
      async function openTile(item: GItem) {
        closeMenu();
        if (item.identifier === d.host.activeIdentifier()) { await d.doc.open(item); return; }
        await d.doc.open(item); await reload();
      }
      function enterFolder(path: string) { setFolder(path); }
      async function openImageTile(img: CloudImageItem) {
        closeMenu();
        if (!d.doc.importImageAsDoc) return;   // 宿主不支持图片转生 → 图片 tile 只显示
        const st = d.store();
        const firstKind = st?.identifiers.kinds[0];
        if (!st || !firstKind) return;   // 没有文档种类 → 图片没有孪生可开
        const twin = imageTwinIdentifier(folder.value, img.label, firstKind.suffix);   // 图片转生成表里第一种文档
        const existing = data.files.find((it) => it.identifier === twin);
        if (existing) { await d.doc.open(existing); return; }
        if (await st.files.occupied(twin)) { const dd = st.identifiers.parse(twin); await d.doc.open({ identifier: twin, stem: dd?.stem ?? twin, kind: dd?.kind ?? firstKind.kind, syncState: "cloud-only" }); return; }
        try {
          const blob = await d.host.busy(t("cp.downloading", { name: img.label }), () => d.data.openCloudImage(img.identifier));
          if (!blob) { d.host.status(t("cp.downloadFailed", { name: img.label }), true); return; }
          await d.doc.importImageAsDoc(new File([blob], img.label, { type: mimeForImageName(img.label) }), { nameOverride: twin });
        } catch (e: unknown) { d.host.status(t("cp.importFailed", { err: String((e as { message?: unknown })?.message || e) }), true); }
      }

      const L = {
        activeTag: t("gal.tile.active"),
        loading: t("gal.loading"), folder: t("gal.folder"), emptyFolder: t("gal.emptyFolder"), more: t("gal.more"),
        delEmptyFolder: t("gal.delEmptyFolder"), delFolderNonEmpty: t("gal.delFolderNonEmpty"), encrypted: t("enc.locked.aria"),
        divergedNote: t("gal.divergedNote"), renameKeep: t("gal.renameKeep"),
        emptyTrash: t("gal.emptyTrashBtn"), emptyBackup: t("gal.emptyBackupBtn"),   // 0.8.6：搁置区视图顶上的「清空…」
        rename: t("gal.rename"), moveTo: t("gal.moveTo"), copy: t("gal.copy"), pullLocal: t("gal.pullLocal"),
        resolve: t("gal.resolve"), unloadLocal: t("gal.unloadLocal"), encrypt: t("menu.encrypt"), decrypt: t("menu.decrypt"),
        toTrash: t("gal.toTrash"), restore: t("gal.restore"), purge: t("gal.purge"),
        imageFile: t("gal.imageFile"), otherFile: t("gal.otherFile"),
        retry: t("gal.retry"), openDiag: t("gal.openDiag"), reload: t("gal.reload"),
        keepOffline: t("gal.keepOffline"), unread: t("gal.marker.unread"),
      };
      const tileAspect = typeof d.tile?.aspect === "number" && Number.isFinite(d.tile.aspect) && d.tile.aspect > 0 ? d.tile.aspect : null;   // null = 默认方图（样式表里的 1 / 1）
      const tileTall = tileAspect != null && tileAspect < 1;
      const tileStyle = tileAspect != null ? { "--tile-aspect": String(tileAspect) } : null;
      return {
        tileTall, tileStyle, layout, setLayout: (l: "cards" | "list") => { layout.value = l; },
        view, folder, loading, stalled, retry, openDiag, reloadApp, openMenu, isEmpty, emptyText, L, phHtml,
        folderTiles, fileTiles, imageTiles, otherTiles, asideTiles, crumbs, badgeIcon2,
        badgeIcon, fmtMeta, humanTime, fullTime, ICON, toggleMenu, menuMount: el, invalidateEncrypted, setFolder, hydrateFolder, enterFolder,
        openTile, tileAction, openImageTile, deleteImage, rename, move, copy, resolve, unload, keepOffline, del, folderDelete, asideRestore, asidePurge, emptyAside,
        encryptItem, decryptItem, onUnlock, requestUnlock, hasEncryption: !!enc,
        reload, setView: (v: GalleryView) => { view.value = v; void reload(); },
      };
    },
    ...tpl("gallery", GALLERY_TEMPLATE),
  });

  const app = createApp(Gallery);
  const vm = app.mount(el) as unknown as GalleryVM;
  return {
    refresh: () => vm.reload(), setView: (v) => vm.setView(v), getView: () => vm.view,
    setLayout: (l) => vm.setLayout(l), getLayout: () => vm.layout,
    setFolder: (p) => vm.setFolder(p), hydrateFolder: (p) => vm.hydrateFolder(p), getFolder: () => vm.folder,
    emptyTrash: (scope) => vm.emptyAside("trash", scope), emptyBackup: (scope) => vm.emptyAside("backup", scope), requestUnlock: () => vm.requestUnlock(), invalidateEncrypted: (name) => vm.invalidateEncrypted(name),
    unmount: () => app.unmount(),
  };
}
