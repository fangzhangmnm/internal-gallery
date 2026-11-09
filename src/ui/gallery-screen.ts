// 图库屏幕（Vue 深模块）——WET 自 WeebPaint src/gallery/gallery.ts v0.14.9（C 骑士轮「UI 深化 candidate 1」），2026-09-09 包化。
// 变化只在接缝（提案 §3「塑」）：Vue 从 deps.vue 注入；session.* 十处 → DocHost；文件动词 → core/verbs；数据 → core/data-face；
//   缩略图 / 加密 / 图标 / 文案 / 诊断 全走注入；宿主布局知识（当前夹记忆、图库模式判定）走 deps。模板与 class 名逐字保留。
import { toggleAdoptedPopup, type PopupMenuHandle } from "@internal/workbench-elements";
import type { SyncState } from "@internal/store";
import type { GItem } from "../core/model/gallery-view-model.ts";
import { tileFor, breadcrumb, asideTileFor, humanTime, humanSize, fullTime, hasLocalCopy, type GalleryTile } from "../core/model/gallery-view-model.ts";
import { ASIDE, type AsideItem, type AsideKind, type AsideScope } from "../core/model/aside.ts";
import { pathJoin } from "../core/model/gallery-path.ts";
import { imageThumbToken, imageTwinIdentifier, mimeForImageName } from "../core/model/cloud-image-model.ts";
import { createEncryptionState, encVersionOf, encryptionMenu, admitThumbBlob, dropPlainByproducts, type EncFacts } from "../core/model/encryption-state.ts";
import { createSealedCover, type CoverShown } from "../core/model/sealed-cover.ts";
import type { TimelineEntry } from "../core/model/timeline-order.ts";
import { foldTimeline, foldedCount, versionsKey } from "../core/model/fold-groups.ts";
import { parseVersionStem } from "../core/model/versions.ts";
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
export interface TileAction { icon: string; title: string; state?: "ready" | "none" | "unknown";
  /** 0.8.8：库自己放的钮（宿主没给 tileAction 时）：resolve = 「处理…」→ verbs.resolve；宿主的钮没有这个字段。 */
  verb?: "resolve" }
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
  /** 0.8.8：只看要处理的（没同步好的那几份）。宿主在登录落地后发现有没传上去的东西时可以直接开图库进这个视图（CatsUp 2026-10-26）。 */
  setAttentionOnly(on: boolean): void;
  /** 0.8.8：当前夹里要处理的份数（和顶部横幅同一个数；只算列过的这一夹）。 */
  getAttentionCount(): number;
  // ── 0.9.0：星 / 收起的筛选，和给宿主编辑器里那扇「门」用的四个动作（都按身份；只在人点了钮之后调）──
  /** 只看加了星的。 */
  setStarredOnly(on: boolean): void;
  /** 当前夹里加了星的份数。 */
  getStarredCount(): number;
  /** 全部展开 / 收回（收起的细条和各版；屏幕上的临时状态，不落盘）。 */
  setExpandAll(on: boolean): void;
  /** 「接着改」：解锁这份作品。成 → true。 */
  unlockEdit(identifier: string): Promise<boolean>;
  /** 「存一版再改」：先存一版，成了才解锁。成 → true。 */
  saveVersionThenUnlock(identifier: string): Promise<boolean>;
  /** 存一版（"new"）/ 存到上一版（"replace-last"）。存成 → 新那一版的身份；没成 → null。 */
  saveVersion(identifier: string, mode: "new" | "replace-last"): Promise<string | null>;
  /** 提前锁上。 */
  lockEdit(identifier: string): Promise<void>;
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
  attentionOnly: boolean; setAttentionOnly(on: boolean): void; attentionCount: number;
  setStarredOnly(on: boolean): void; starredCount: number; setExpandAll(on: boolean): void;
  unlockEditById(id: string): Promise<boolean>; versionThenUnlockById(id: string): Promise<boolean>; saveVersionById(id: string, mode: "new" | "replace-last"): Promise<string | null>; lockEditById(id: string): Promise<void>;
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
    star: icon("star"), pencil: icon("pencil"), fold: icon("archive-box"),   // 0.9.0：星 / 解着锁可以改 / 收起的细条
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
    // 0.8.11：sealed = 已知这份是加密的（本地字节 ∨ store 的事实，见 core/model/encryption-state.ts）。已知加密 → 明文图一律不显示（现拉的、缓存命中的、拉不到时退回来的旧图都算），
    //   已经显示着的明文图当场撤掉；拿到密文 peek 就 emit("sealed") 把这个事实报给图库（卡片的锁 / 菜单跟着变）。
    props: { encName: { type: String, default: null }, fetchable: { type: Boolean, default: false }, isCloud: { type: Boolean, default: false }, cloudNewer: { type: Boolean, default: false }, thumbToken: { type: String, default: "" }, fallback: { type: String, default: "?" }, fallbackHtml: { type: String, default: "" }, alt: { type: String, default: "" }, sealed: { type: Boolean, default: false } },
    emits: ["unlock", "sealed"],
    setup(props: { encName: string | null; fetchable: boolean; isCloud: boolean; cloudNewer: boolean; thumbToken: string; fallback: string; fallbackHtml: string; alt: string; sealed: boolean }, ctx: { emit: (event: string, ...args: unknown[]) => void }) {
      const url = ref<string | null>(null), showCloud = ref(false), locked = ref(false), root = ref<HTMLElement | null>(null);
      let cloudEncBlob: Blob | null = null, objUrl: string | null = null, obs: IntersectionObserver | null = null;
      let shown: CoverShown = "none";   // 当前显示的图是哪来的：plain = 没经过解密的明文图（已知加密时要撤，0.8.11）；decrypted = 解密得来的（锁上时要撤，0.8.12）
      const blurb = ref("");
      // 0.2.0：缩略图 PNG 自带的 Description 文本块 = 腰封 / caption → 悬停 tooltip（user 2026-09-10「thumbnail.png 的标准 tEXt 文本块…gallery 库的公共行为」）
      const readBlurb = (blob: Blob) => { void blob.arrayBuffer().then((ab) => { const u8 = new Uint8Array(ab); blurb.value = isPng(u8) ? (readPngText(u8)[PNG_BLURB_KEYWORD] ?? "") : ""; }).catch(() => { blurb.value = ""; }); };
      const setBlob = (blob: Blob, from: "plain" | "decrypted") => { if (objUrl) URL.revokeObjectURL(objUrl); objUrl = URL.createObjectURL(blob); url.value = objUrl; shown = from; readBlurb(blob); };
      const clearShown = () => { if (objUrl) URL.revokeObjectURL(objUrl); objUrl = null; url.value = null; blurb.value = ""; shown = "none"; };
      // 0.8.12（周账 F-228）：解密、显示、锁上时撤掉，这一段状态机住 core/model/sealed-cover.ts（有测试）；这里只借手脚给它。
      const cover = enc ? createSealedCover({
        isUnlocked: () => enc.isUnlocked(),
        hasSource: () => !!props.encName || cloudEncBlob != null,
        decrypt: async () => props.encName ? enc.localPeekThumb(props.encName) : cloudEncBlob ? enc.decryptCloudPeekThumb(props.alt, cloudEncBlob) : null,
        shown: () => shown, locked: () => locked.value,
        show: (png) => setBlob(png, "decrypted"), clear: clearShown, setLocked: (v) => { locked.value = v; },
        onError: (err) => d.reportError(new Error("[gallery] decrypt cover: " + String(err)), "log"),
      }) : null;
      const tryDecrypt = (): Promise<void> => {
        if (cover) return cover.tryDecrypt();
        if (shown === "plain") clearShown();   // 没有加密端口：解不了，只有锁
        locked.value = true; return Promise.resolve();
      };
      let fetchSeq = 0;
      const fetchThumb = () => {
        if (!d.thumbs) return;   // 无缩略图政策（WXHW 2.0）→ 保持占位
        const seq = ++fetchSeq;
        d.thumbs.getOrFetch(props.alt, props.thumbToken, props.cloudNewer ? "cloud" : "local")
          .then(({ blob }) => {
            if (seq !== fetchSeq) return; showCloud.value = false;
            if (!blob) return;   // 0.2.2：确定没缩略图 → 占位图标（书），不是云
            const verdict = admitThumbBlob(blob, { sealed: props.sealed, isEncryptedPeekBlob: enc ? (b) => enc.isEncryptedPeekBlob(b) : undefined });
            if (verdict === "enc-peek") { cloudEncBlob = blob; ctx.emit("sealed"); return tryDecrypt(); }
            if (verdict === "refuse") { if (shown === "plain") clearShown(); return; }   // 0.8.11：已知加密 → 明文图不显示、不退回
            setBlob(blob, "plain");
          })
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
      watch(() => _lockState.unlocked, () => { cover?.onLockChange(_lockState.unlocked); });   // 锁上 = 解密得来的封面当场撤（同步）；解锁 = 重新试解
      // 0.8.11：图库刚知道这份是加密的 → 显示着的明文图当场撤；本地字节变成容器（encName 来了）→ 走本地解密那条；容器变回明文（encName 走了）→ 按普通图重拉
      watch(() => props.sealed, () => { if (props.sealed && shown === "plain") clearShown(); });
      watch(() => props.encName, () => {
        if (props.encName) { void tryDecrypt(); return; }
        cloudEncBlob = null; locked.value = false;
        if (props.fetchable && !obs) fetchThumb();
      });
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
      const data = reactive<{ files: GItem[]; images: CloudImageItem[]; others: GallerySnapshot["others"]; folderNames: string[]; timeline: TimelineEntry[] }>({ files: [], images: [], others: [], folderNames: [], timeline: [] });
      const aside = ref<AsideItem[]>([]);   // 当前开着的那个搁置区的列表（回收站 / 备份箱）
      const openMenu = ref<string | null>(null);
      function safeFolder() { try { return d.folderMemory?.get() || ""; } catch { return ""; } }

      let _unsub: (() => void) | null = null, _framedFolder: string | null = null, _awaitingFirst = false, _subscribedAt = 0;
      function applyFrame(snap: GallerySnapshot) {
        if (view.value !== "files" || snap.folder !== folder.value) return;
        data.files = snap.items; data.images = snap.images; data.others = snap.others; data.folderNames = snap.folderNames; data.timeline = snap.timeline;
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
      // 0.9.0：这个库有没有锁 / 记号（store ≥ 2.3.0 的两个开关；老版本的库 = 都没有，界面上不出现任何相关的东西）+ 这台设备上活着的解锁。
      //   库会换（多库切换）：每次订阅都对一下，换了库就重订。
      const caps = reactive({ lock: false, marks: false });
      const _unlocked = reactive(new Set<string>());
      let _capStore: unknown = undefined, _unlockUnsub: (() => void) | null = null;
      function syncCaps(): void {
        const st = d.store();
        if (st === _capStore) return;
        _capStore = st; _unlockUnsub?.(); _unlockUnsub = null; _unlocked.clear();
        caps.lock = st?.files.lockByDefault === true; caps.marks = st?.files.fileMarks === true;
        if (caps.lock && st?.files.watchUnlocks) _unlockUnsub = st.files.watchUnlocks((live) => { _unlocked.clear(); for (const u of live) _unlocked.add(u.identifier); });
      }
      function subscribe() {
        syncCaps();
        _unsub?.(); _unsub = null;
        if (view.value !== "files") return;
        if (!d.store()) { data.files = []; data.images = []; data.others = []; data.folderNames = []; data.timeline = []; loading.value = false; wd.cancel(); stalled.value = null; return; }   // 无库：不订阅、空网格
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

      // 0.8.11 加密态（core/model/encryption-state.ts）：本地字节 ∨ store 的事实，结论绑版本戳。
      //   以前是 encByName：按名字探一次本地字节就永远记着——别的设备加密、这台快进拿到容器之后还说「没加密」。现在版本变了就重探。
      const encState = createEncryptionState(reactive<Record<string, EncFacts>>({}));
      let _probing: Promise<void> | null = null, _probeAgain = false;
      async function probeOnce(): Promise<void> {
        for (const it of data.files) {
          const v = encVersionOf(it);
          if (!encState.needsLocalProbe(it.identifier, v)) continue;
          if (!hasLocalCopy(it.syncState)) { encState.noteLocal(it.identifier, v, false); continue; }   // 本地没字节：本地这一路不说加密（云端那一路另算）
          let r = false;
          try { r = await enc!.isEncrypted(it.identifier); } catch { r = false; }
          encState.noteLocal(it.identifier, v, r);
        }
      }
      /** 串行：同一时刻只有一趟在探；探的时候又来了新帧 → 这一趟完了再按最新的列表补一趟（防旧版本的结论晚到、盖掉新版本的）。 */
      function probeEncrypted(): Promise<void> {
        if (!enc) return Promise.resolve();
        if (_probing) { _probeAgain = true; return _probing; }
        _probing = (async () => { try { do { _probeAgain = false; await probeOnce(); } while (_probeAgain); } finally { _probing = null; } })();
        return _probing;
      }
      function invalidateEncrypted(name: string) { encState.forget(name); void probeEncrypted(); }
      /** 格子拿到了 store 的密文 peek = store 说这一版是加密容器。 */
      function notePeekSealed(item: GItem) { encState.notePeek(item.identifier, encVersionOf(item)); }
      async function requestUnlock(): Promise<boolean> {
        await probeEncrypted();
        for (const it of data.files) { if (!hasLocalCopy(it.syncState) || !encState.isLocalEncrypted(it.identifier, encVersionOf(it))) continue; return await verbs.unlock(it.identifier); }
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
        _unlockUnsub?.(); _unlockUnsub = null;
        document.removeEventListener("pointerdown", _onGatePtrDown, true);
        document.removeEventListener("pointerup", _onGatePtrUp, true);
        document.removeEventListener("pointercancel", _onGatePtrUp, true);
      });

      const folderTiles = computed(() => data.folderNames.map((fn) => ({ name: fn, path: pathJoin(folder.value, fn) })));
      // 0.8.8：要处理的卡片，宿主没放钮的话库自己放一粒可见的「处理…」（user 2026-10-26「处理的东西应该图库上多一个按钮图示……只有非常小的云图标提示……在...里面」）
      const attentionAction = (tile: GalleryTile): TileAction | null => tile.attention ? { icon: "cloud-pending", title: t("gal.resolve"), state: "ready", verb: "resolve" } : null;
      // 0.8.11：t.encrypted = 加密态（本地字节 ∨ store 的事实）→ 锁、不显示明文封面、不取 / 不给事实；encLocal = 只看本地字节（本地解密封面那条路、「解除加密…」）。
      // 0.9.0：每份原作现在有几版（一趟扫完；「存到上一版」给不给看它）
      const versionCounts = computed(() => { const m = new Map<string, number>(); for (const it of data.files) { const v = parseVersionStem(it.stem); if (v) { const k = `${it.kind}\u0000${v.base}`; m.set(k, (m.get(k) ?? 0) + 1); } } return m; });
      const fileTiles = computed(() => data.files.map((it) => {
        const encV = encVersionOf(it), encrypted = encState.isEncrypted(it.identifier, encV, it.cloudSealed === true), encLocal = encState.isLocalEncrypted(it.identifier, encV);
        const tile = tileFor(it, { signedIn: d.host.signedIn(), activeIdentifier: d.host.activeIdentifier(), encrypted, lockable: caps.lock, unlocked: _unlocked.has(it.identifier) });
        const asVersion = parseVersionStem(it.stem);
        const info = fileInfo(it), facts = encrypted ? null : factsOf(it.identifier);   // 加密件的事实是明文时代留下的 → 不给宿主画
        const encMenu = encryptionMenu({ hasEncryption: !!enc, hasLocal: tile.hasLocal, encrypted, localEncrypted: encLocal });
        return { key: it.identifier, ft: null, strip: null, dim: false, nVersions: 0, versionsOpen: false, vKey: versionsKey(it.identifier),   // 后五个 = 收起那一层的显示状态（timelineRows 里按行覆盖）
          isVersion: asVersion != null, hasPrevVersion: (versionCounts.value.get(`${it.kind}\u0000${asVersion?.base ?? it.stem}`) ?? 0) > 0,
          item: it, t: tile, encV, encLocal, encMenu, sub: subtitleOf(it), marker: markerOf(it), ov: ovHtml(it.identifier, info, facts), thumb: hasThumb(it.kind), info, facts, act: actionOf(it.identifier, info, facts) ?? attentionAction(tile) };
      }));
      // 0.8.12：作品和文件夹合成一列（顺序 = 数据面给的 timeline，规则只在 core/model/timeline-order.ts）；文件夹不再单独钉在最上面。
      //   一行要么是文件夹（ft 有值），要么是作品（ft = null，其余字段同上）；模板按 ft 分叉。
      // 0.9.0 收起（core/model/fold-groups.ts）：存下来的各版收在原作那一格底下（+N）、手动收起的挨着合成一条细条；点开原地摊开——屏幕上的临时状态，不落盘。
      //   一行多一种：细条（strip 有值）。
      const expanded = reactive(new Set<string>());
      const expandAll = ref(false);
      const toggleFold = (key: string): void => { if (expanded.has(key)) expanded.delete(key); else expanded.add(key); };
      const foldedN = computed(() => foldedCount(data.timeline));
      const timelineRows = computed(() => {
        const byId = new Map(fileTiles.value.map((r) => [r.t.identifier, r] as const));
        type FileRow = (typeof fileTiles.value)[number];
        const rows: ({ key: string; ft: { name: string; path: string }; strip: null } | { key: string; ft: null; strip: { open: boolean; label: string } } | FileRow)[] = [];
        for (const e of foldTimeline(data.timeline, { isOpen: (k) => expanded.has(k), expandAll: expandAll.value })) {
          if (e.type === "folder") { const path = pathJoin(folder.value, e.name); rows.push({ key: "F:" + path, ft: { name: e.name, path }, strip: null }); }
          else if (e.type === "strip") rows.push({ key: e.key, ft: null, strip: { open: e.open, label: t(e.open ? "gal.fold.stripOpen" : "gal.fold.strip", { n: e.count }) } });
          else { const r = byId.get(e.item.identifier); if (r) rows.push({ ...r, dim: e.dim, nVersions: e.versions.length, versionsOpen: e.versionsOpen }); }
        }
        return rows;
      });
      // 0.8.8：顶部横幅「有 N 份要处理 → 看列表」+ 只看要处理的（user「你一开始说批量处理我以为的是给你一个列表你当时就立刻点」——列表 = 这几张卡，每张一粒「处理…」，点了当场弹面）
      const attentionWanted = ref(false);   // 宿主 / 用户要的；帧还没到时也能先记下（setAttentionOnly(true) 紧跟 open()）
      const attentionCount = computed(() => fileTiles.value.reduce((n, r) => n + (r.t.attention ? 1 : 0), 0));
      const attentionOnly = computed(() => attentionWanted.value && attentionCount.value > 0);   // 没有要处理的 = 当没开（绝不留一个空格子）
      // 0.9.0：只看加了星的（平铺，不折叠；没有加星的 = 当没开）
      const starredWanted = ref(false);
      const starredCount = computed(() => fileTiles.value.reduce((n, r) => n + (r.t.starred ? 1 : 0), 0));
      const starredOnly = computed(() => starredWanted.value && starredCount.value > 0);
      const shownTimeline = computed(() => attentionOnly.value ? fileTiles.value.filter((r) => r.t.attention)   // 只看要处理的 = 只有那几份作品，文件夹不画
        : starredOnly.value ? fileTiles.value.filter((r) => r.t.starred) : timelineRows.value);
      const attentionText = computed(() => t(attentionOnly.value ? "gal.attention.showing" : "gal.attention.banner", { n: attentionCount.value }));
      let _prevAttention = 0;
      watch(() => attentionCount.value, () => { const n = attentionCount.value; if (n === 0 && _prevAttention > 0) attentionWanted.value = false; _prevAttention = n; });   // 都处理完了 → 回全部
      const setAttentionOnly = (on: boolean) => { attentionWanted.value = on; };
      // 0.8.0：列表一变就把该取的事实排上（加密件不取：尾读到的是密文）；事实到了 _facts 变 → fileTiles 重算 → 钮 / 覆盖层跟着
      const askFacts = () => { if (!d.facts) return; for (const r of fileTiles.value) if (!r.t.encrypted && (r.t.hasCloud || r.t.hasLocal)) wantFacts(r.t.identifier, r.item.kind, String(r.t.time || r.t.size || 0), r.t.cloudNewer ? "cloud" : "local"); };
      watch(() => fileTiles.value, askFacts); askFacts();
      // 0.8.11：一知道这份（这一版）是加密的，派生缓存里加密之前留下的明文副产品立刻删——不等格子滚到眼前、不等拉到新图（CatsUp 2026-11-03 报告 C2「还留一个缝」）。
      //   每份每版只删一次（删 = 缓存 invalidate，会广播让格子重来；只删一次防来回）。
      const _plainDropped = new Set<string>();
      const dropKnownEncryptedPlain = () => {
        if (!enc || (!d.thumbs && !d.facts)) return;
        for (const r of fileTiles.value) {
          if (!r.t.encrypted) continue;
          const k = `${r.t.identifier}\u0000${r.encV}`;
          if (_plainDropped.has(k)) continue;
          _plainDropped.add(k);
          const id = r.t.identifier;
          void dropPlainByproducts(id, { thumbs: d.thumbs, facts: d.facts, isEncryptedPeekBlob: (b) => enc.isEncryptedPeekBlob(b) })
            .then((x) => { if (x.facts) _facts.delete(id); if (x.thumb || x.facts) diagNote("gallery", `dropped plaintext byproducts of an encrypted file: thumb=${x.thumb} facts=${x.facts}`); })
            .catch((err: unknown) => d.reportError(new Error("[gallery] drop plaintext byproducts: " + String(err)), "log"));
        }
      };
      watch(() => fileTiles.value, dropKnownEncryptedPlain); dropKnownEncryptedPlain();
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
      // 0.9.0 锁 / 星 / 收起 / 存一版：都是人点了菜单才走到这里。不 reload——库自己会给这一夹重画一帧（存了新文件 / 记号变了），解锁走 watchUnlocks；重订一次 = 白白重列一遍云端。
      const act = <A extends unknown[]>(fn: (...a: A) => Promise<unknown>) => async (...a: A) => { closeMenu(); await fn(...a); };
      const unlockAndOpen = act(async (item: GItem) => { if (await verbs.unlockEdit(item)) await openTile(item); });                        // 「接着改」= 解锁并打开
      const versionThenEdit = act(async (item: GItem) => { if (await verbs.saveVersionThenUnlock(item, data.files)) await openTile(item); });   // 「存一版再改」
      const lockEdit = act((item: GItem) => verbs.lockEdit(item));
      const saveVersion = act((item: GItem) => verbs.saveVersion(item, "new", data.files));
      const saveVersionReplace = act((item: GItem) => verbs.saveVersion(item, "replace-last", data.files));
      const star = act((item: GItem) => verbs.star(item)), unstar = act((item: GItem) => verbs.unstar(item));
      const fold = act((item: GItem) => verbs.fold(item)), unfold = act((item: GItem) => verbs.unfold(item));
      // 宿主编辑器里那扇门按身份叫进来：在当前夹里就用这一夹的条目，不在就按身份现拼一条（同夹的兄弟只认得当前夹里的）。
      const itemOf = (identifier: string): GItem => data.files.find((it) => it.identifier === identifier)
        ?? (() => { const p = d.store()?.identifiers.parse(identifier); return { identifier, stem: p?.stem ?? identifier, kind: p?.kind ?? "", syncState: "synced" as const }; })();
      const siblingsOf = (identifier: string): GItem[] => { const f = identifier.includes("/") ? identifier.slice(0, identifier.lastIndexOf("/")) : ""; return f === folder.value ? data.files : []; };

      /** 0.8.0：卡片上的动作钮（不打开那份）。0.8.8：库自己放的「处理…」走 verbs.resolve；宿主的钮照旧走 doc.tileAction。 */
      function tileAction(row: { item: GItem; act: TileAction | null }) {
        if (row.act?.verb === "resolve") { void resolve(row.item); return; }
        const item = row.item;
        try { void Promise.resolve(d.doc.tileAction?.(item, factsOf(item.identifier))).catch((e: unknown) => d.reportError(e)); } catch (e) { d.reportError(e); }
      }
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
        attentionList: t("gal.attention.list"), attentionAll: t("gal.attention.all"),   // 0.8.8
        editContinue: t("gal.editLock.continue"), editVersionThen: t("gal.editLock.versionThenEdit"), editLock: t("gal.editLock.lock"), unlockedMark: t("gal.editLock.unlockedMark"),   // 0.9.0
        saveVersion: t("gal.saveVersion"), saveVersionReplace: t("gal.saveVersionReplace"), star: t("gal.star"), unstar: t("gal.unstar"), starredMark: t("gal.starredMark"),
        fold: t("gal.fold"), unfold: t("gal.unfold"), expandAll: t("gal.fold.expandAll"), collapseAll: t("gal.fold.collapseAll"), starOnly: t("gal.star.only"), starAll: t("gal.star.all"),
      };
      const versionsTitle = (n: number): string => t("gal.fold.versions", { n });
      const starBarText = computed(() => t("gal.star.bar", { n: starredCount.value }));
      const foldBarText = computed(() => t("gal.fold.bar", { n: foldedN.value }));
      const tileAspect = typeof d.tile?.aspect === "number" && Number.isFinite(d.tile.aspect) && d.tile.aspect > 0 ? d.tile.aspect : null;   // null = 默认方图（样式表里的 1 / 1）
      const tileTall = tileAspect != null && tileAspect < 1;
      const tileStyle = tileAspect != null ? { "--tile-aspect": String(tileAspect) } : null;
      return {
        tileTall, tileStyle, layout, setLayout: (l: "cards" | "list") => { layout.value = l; },
        view, folder, loading, stalled, retry, openDiag, reloadApp, openMenu, isEmpty, emptyText, L, phHtml,
        folderTiles, fileTiles, shownTimeline, imageTiles, otherTiles, asideTiles, crumbs, badgeIcon2,
        attentionOnly, attentionCount, attentionText, setAttentionOnly, toggleAttentionOnly: () => setAttentionOnly(!attentionWanted.value),   // 0.8.8
        caps, toggleFold, expandAll, foldedN, foldBarText, starBarText, versionsTitle, toggleExpandAll: () => { expandAll.value = !expandAll.value; if (!expandAll.value) expanded.clear(); },   // 0.9.0
        setExpandAll: (on: boolean) => { expandAll.value = on; if (!on) expanded.clear(); },
        starredOnly, starredCount, setStarredOnly: (on: boolean) => { starredWanted.value = on; }, toggleStarredOnly: () => { starredWanted.value = !starredOnly.value; },
        unlockAndOpen, versionThenEdit, lockEdit, saveVersion, saveVersionReplace, star, unstar, fold, unfold,
        unlockEditById: (id: string) => verbs.unlockEdit(itemOf(id)), versionThenUnlockById: (id: string) => verbs.saveVersionThenUnlock(itemOf(id), siblingsOf(id)),
        saveVersionById: (id: string, mode: "new" | "replace-last") => verbs.saveVersion(itemOf(id), mode, siblingsOf(id)), lockEditById: (id: string) => verbs.lockEdit(itemOf(id)),
        badgeIcon, fmtMeta, humanTime, fullTime, ICON, toggleMenu, menuMount: el, invalidateEncrypted, setFolder, hydrateFolder, enterFolder,
        openTile, tileAction, openImageTile, deleteImage, rename, move, copy, resolve, unload, keepOffline, del, folderDelete, asideRestore, asidePurge, emptyAside,
        encryptItem, decryptItem, onUnlock, requestUnlock, hasEncryption: !!enc, notePeekSealed,
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
    setAttentionOnly: (on) => vm.setAttentionOnly(on), getAttentionCount: () => vm.attentionCount,   // 0.8.8
    setStarredOnly: (on) => vm.setStarredOnly(on), getStarredCount: () => vm.starredCount, setExpandAll: (on) => vm.setExpandAll(on),   // 0.9.0
    unlockEdit: (id) => vm.unlockEditById(id), saveVersionThenUnlock: (id) => vm.versionThenUnlockById(id), saveVersion: (id, mode) => vm.saveVersionById(id, mode), lockEdit: (id) => vm.lockEditById(id),
    setFolder: (p) => vm.setFolder(p), hydrateFolder: (p) => vm.hydrateFolder(p), getFolder: () => vm.folder,
    emptyTrash: (scope) => vm.emptyAside("trash", scope), emptyBackup: (scope) => vm.emptyAside("backup", scope), requestUnlock: () => vm.requestUnlock(), invalidateEncrypted: (name) => vm.invalidateEncrypted(name),
    unmount: () => app.unmount(),
  };
}
