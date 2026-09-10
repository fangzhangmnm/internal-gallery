// 图库屏幕（Vue 深模块）——WET 自 WeebPaint src/gallery/gallery.ts v0.14.9（C 骑士轮「UI 深化 candidate 1」），2026-09-09 包化。
// 变化只在接缝（提案 §3「塑」）：Vue 从 deps.vue 注入；session.* 十处 → DocHost；文件动词 → core/verbs；数据 → core/data-face；
//   缩略图 / 加密 / 图标 / 文案 / 诊断 全走注入；宿主布局知识（当前夹记忆、图库模式判定）走 deps。模板与 class 名逐字保留。
import type { GItem, TrashGItem, CloudFileMeta } from "../core/model/gallery-view-model.ts";
import { tileFor, breadcrumb, trashTileFor, humanTime, humanSize } from "../core/model/gallery-view-model.ts";
import { pathJoin } from "../core/model/gallery-path.ts";
import type { NameBoundary } from "../core/model/gallery-model.ts";
import { imageThumbToken, imageTwinBareName, mimeForImageName } from "../core/model/cloud-image-model.ts";
import { createFrameGate } from "../core/guards/frame-gate.ts";
import { createFirstFrameWatchdog } from "../core/guards/first-frame-watchdog.ts";
import { note as diagNote } from "../core/guards/diag-log.ts";
import type { GalleryDataFace, GallerySnapshot, CloudImageItem } from "../core/data-face.ts";
import { createGalleryVerbs, type VerbHost, type VerbDoc, type VerbStore, type VerbEncryption } from "../core/verbs.ts";
import type { ThumbCache } from "../core/thumbs/thumb-cache.ts";
import { t } from "../core/text.ts";
import { isPng, readPngText, PNG_BLURB_KEYWORD } from "../core/thumbs/png-text.ts";

/** 宿主 vendored 的 Vue prod ESM（提案 §7.1 决定 (a)）。 */
export interface VueRuntime {
  createApp: (root: unknown) => { mount(el: HTMLElement): unknown; unmount(): void };
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
export interface GalleryDocHost extends VerbDoc {
  open(item: GItem): Promise<void>;
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
    /** 0.1.2：无缩略图时卡片占位内容（HTML，通常是一枚图标）。不给 → 退回名字首字（WeebPaint 默认；WXHW 2026-09-10 user「所有的预览图都是 2……不要从名字生成」→ 宿主给 book/file 图标）。 */
    tilePlaceholderHtml?: (name: string) => string | undefined;
  };
  /** 0.2.0：卡片比例。"1/1" 方图（WeebPaint 默认）；"2/3" 竖版书封（WXHW 书库；窄屏一排三本）。 */
  tile?: { aspect?: "1/1" | "2/3" };
  /** 0.2.1：这份文档有没有缩略图可取（WXHW：txt 稿没有 → 不去尾读、加密 txt 不显锁图标）。不给 = 全部都有（WeebPaint）。 */
  hasThumb?: (fullName: string) => boolean;
  naming?: NameBoundary;
  isZipDoc?: (fullName: string) => boolean;
  thumbs?: ThumbCache;
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

export interface GalleryHandle {
  refresh(): void;
  setView(v: "files" | "trash"): void;
  getView(): "files" | "trash";
  setFolder(path: string): void;
  hydrateFolder(path: string): void;
  getFolder(): string;
  emptyTrash(scope?: "local" | "cloud" | "both"): void;
  requestUnlock(): Promise<boolean>;
  invalidateEncrypted(name: string): void;
  unmount(): void;
}
interface GalleryVM {
  reload(): void; setView(v: "files" | "trash"): void; view: "files" | "trash";
  setFolder(p: string): void; hydrateFolder(p: string): void; folder: string;
  emptyTrash(scope?: "local" | "cloud" | "both"): void; requestUnlock(): Promise<boolean>; invalidateEncrypted(name: string): void;
}
const PIXELATED_THUMB_MAX_EDGE = 128;
function thumbLoadPixelated(e: Event): boolean {
  const img = e.target as HTMLImageElement; const edge = Math.max(img.naturalWidth, img.naturalHeight);
  return edge > 0 && edge < PIXELATED_THUMB_MAX_EDGE;
}
const IDENTITY: NameBoundary = { bare: (s) => s, full: (b) => b };

export function mountGalleryScreen(el: HTMLElement, d: GalleryScreenDeps): GalleryHandle {
  const { createApp, defineComponent, reactive, ref, computed, watch, onMounted, onUnmounted, nextTick } = d.vue;
  const naming = d.naming ?? IDENTITY;
  const icon = d.ui.iconHtml;
  const phHtml = (name: string): string => d.ui.tilePlaceholderHtml?.(name) ?? "";   // 0.1.2：宿主给的占位图标；空 = 退回名字首字
  const hasThumb = (name: string): boolean => d.hasThumb?.(name) ?? true;
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
  const thumbKey = (bare: string) => naming.full(bare);

  const ThumbCell = defineComponent({
    name: "ThumbCell",
    props: { localThumb: { default: null }, encName: { type: String, default: null }, cloud: { default: null }, fetchable: { type: Boolean, default: false }, isCloud: { type: Boolean, default: false }, cloudNewer: { type: Boolean, default: false }, thumbToken: { type: String, default: "" }, fallback: { type: String, default: "?" }, fallbackHtml: { type: String, default: "" }, alt: { type: String, default: "" } },
    emits: ["unlock"],
    setup(props: { localThumb: Blob | null; encName: string | null; cloud: CloudFileMeta | null; fetchable: boolean; isCloud: boolean; cloudNewer: boolean; thumbToken: string; fallback: string; fallbackHtml: string; alt: string }) {
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
          .then(({ blob }) => { if (seq !== fetchSeq) return; showCloud.value = false; if (enc?.isEncryptedPeekBlob(blob)) { cloudEncBlob = blob; return tryDecrypt(); } setBlob(blob); })
          .catch((err: unknown) => d.reportError(new Error("[gallery] thumb: " + String(err)), "log"));
      };
      onMounted(() => {
        if (props.localThumb) { setBlob(props.localThumb); return; }
        if (props.encName) { void tryDecrypt(); return; }
        if (props.fetchable && d.thumbs) {
          if (props.isCloud) showCloud.value = true;
          obs = new IntersectionObserver((entries) => { for (const e of entries) { if (!e.isIntersecting) continue; obs?.disconnect(); obs = null; fetchThumb(); } }, { rootMargin: "600px 0px", threshold: 0.01 });
          void nextTick(() => { if (obs && root.value) obs.observe(root.value); });
        }
      });
      watch(() => _lockState.unlocked, () => { if (locked.value || props.encName) void tryDecrypt(); });
      watch(() => [props.thumbToken, props.cloudNewer, _thumbRev.get(thumbKey(props.alt)) ?? 0], () => {
        if (props.localThumb) return;
        if (props.encName) { void tryDecrypt(); return; }
        if (!props.fetchable || obs) return;
        fetchThumb();
      });
      onUnmounted(() => { obs?.disconnect(); if (objUrl) URL.revokeObjectURL(objUrl); });
      const pixelated = ref(false);
      const onThumbLoad = (e: Event) => { pixelated.value = thumbLoadPixelated(e); };
      return { url, showCloud, locked, root, ICON, lockedTitle: t("gal.lockedThumb"), pixelated, onThumbLoad, blurb };
    },
    template: `
    <img v-if="url" class="gallery-tile-thumb" :class="{ pixelated }" :src="url" :alt="alt" :title="blurb || null" loading="lazy" @load="onThumbLoad" />
    <div v-else-if="locked" class="gallery-tile-thumb placeholder locked" :title="lockedTitle" @click.stop="$emit('unlock', encName || alt)">
      <span style="width:42px;height:42px;display:inline-block" v-html="ICON.lock"></span>
    </div>
    <div v-else class="gallery-tile-thumb placeholder" ref="root">
      <span v-if="showCloud" style="width:48px;height:48px;display:inline-block" v-html="ICON.cloudBig"></span>
      <span v-else-if="fallbackHtml" class="gallery-tile-ph-icon" v-html="fallbackHtml"></span>
      <template v-else>{{ fallback }}</template>
    </div>`,
  });

  const ImageThumbCell = defineComponent({
    name: "ImageThumbCell",
    props: { path: { type: String, required: true }, token: { type: String, default: "" }, fallback: { type: String, default: "?" }, alt: { type: String, default: "" } },
    setup(props: { path: string; token: string; fallback: string; alt: string }) {
      const url = ref<string | null>(null), root = ref<HTMLElement | null>(null);
      let objUrl: string | null = null, obs: IntersectionObserver | null = null, fetchSeq = 0;
      const fetchThumb = () => {
        if (!d.imageThumbs) return;
        const seq = ++fetchSeq;
        d.imageThumbs.getOrFetch(props.path, props.token)
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
    template: `
    <img v-if="url" class="gallery-tile-thumb" :class="{ pixelated }" :src="url" :alt="alt" loading="lazy" @load="onThumbLoad" />
    <div v-else class="gallery-tile-thumb placeholder" ref="root">{{ fallback }}</div>`,
  });

  const Gallery = defineComponent({
    name: "Gallery",
    components: { ThumbCell, ImageThumbCell },
    setup() {
      const view = ref<"files" | "trash">("files");
      const folder = ref<string>(safeFolder());
      const loading = ref(false);
      const data = reactive<{ files: GItem[]; images: CloudImageItem[]; others: GallerySnapshot["others"]; folderNames: string[] }>({ files: [], images: [], others: [], folderNames: [] });
      const trash = ref<TrashGItem[]>([]);
      const openMenu = ref<string | null>(null);
      function safeFolder() { try { return d.folderMemory?.get() || ""; } catch { return ""; } }

      let _unsub: (() => void) | null = null, _framedFolder: string | null = null, _awaitingFirst = false, _subscribedAt = 0;
      function applyFrame(snap: GallerySnapshot) {
        if (view.value !== "files" || snap.path !== folder.value) return;
        data.files = snap.items; data.images = snap.images; data.others = snap.others; data.folderNames = snap.folderNames;
        _framedFolder = snap.path; loading.value = false;
        wd.frame(snap.path);
        if (stalled.value) stalled.value = null;
        if (_awaitingFirst) { _awaitingFirst = false; diagNote("gallery", `first frame folder="${snap.path}" items=${snap.items.length} folders=${snap.folderNames.length} in ${Math.round(performance.now() - _subscribedAt)}ms`); }
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
      function retry(): void { diagNote("gallery", `retry folder="${folder.value}"`); stalled.value = null; _framedFolder = null; subscribe(); }
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
        _unsub = d.data.watchFolder(folder.value, (snap) => { if (snap.path !== folder.value) return; if (loading.value) applyFrame(snap); else gate.push(snap); }, { onError: onFrameError });
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
        for (const nm of data.files.filter((it) => it.local).map((it) => it.name)) {
          if (nm in encByName) continue;
          try { encByName[nm] = await enc.isEncrypted(nm); } catch { encByName[nm] = false; }
        }
      }
      function invalidateEncrypted(name: string) { delete encByName[name]; void probeEncrypted(); }
      async function requestUnlock(): Promise<boolean> {
        await probeEncrypted();
        for (const it of data.files) { if (!it.local || !encByName[it.name]) continue; return await verbs.unlock(it.name); }
        return false;
      }
      async function loadTrash() { loading.value = true; try { trash.value = await d.data.listTrash(); } finally { loading.value = false; } }
      async function reload() { openMenu.value = null; if (view.value === "trash") { _unsub?.(); _unsub = null; await loadTrash(); } else subscribe(); }
      function setFolder(p: string) { folder.value = p || ""; try { d.folderMemory?.set(folder.value); } catch { /* noop */ } openMenu.value = null; subscribe(); }
      function hydrateFolder(p: string) { if ((p || "") === folder.value) return; folder.value = p || ""; openMenu.value = null; subscribe(); }
      subscribe();
      onUnmounted(() => {
        _unsub?.(); _unsub = null; wd.cancel(); gate.reset();
        document.removeEventListener("pointerdown", _onGatePtrDown, true);
        document.removeEventListener("pointerup", _onGatePtrUp, true);
        document.removeEventListener("pointercancel", _onGatePtrUp, true);
      });

      const folderTiles = computed(() => data.folderNames.map((fn) => ({ name: fn, path: pathJoin(folder.value, fn) })));
      const fileTiles = computed(() => data.files.map((it) => { const tile = tileFor(it, { signedIn: d.host.signedIn(), activeName: d.host.activeName(), encrypted: !!encByName[it.name] }); if (naming.display) tile.displayName = naming.display(tile.displayName); return { item: it, t: tile }; }));
      const trashTiles = computed(() => trash.value.map((it) => ({ item: it, t: trashTileFor(it) })));
      const imageTiles = computed(() => data.images.map((im) => ({ raw: im, path: im.path, name: im.name, size: im.size || 0, time: im.lastModified || 0, token: imageThumbToken(im) })));
      const otherTiles = computed(() => data.others.map((o) => ({ path: o.path, name: o.name, size: o.size || 0, time: o.lastModified || 0 })));
      const crumbs = computed(() => breadcrumb(folder.value));
      const isEmpty = computed(() => view.value === "trash" ? trashTiles.value.length === 0 : folderTiles.value.length === 0 && fileTiles.value.length === 0 && imageTiles.value.length === 0 && otherTiles.value.length === 0);
      const emptyText = computed(() => view.value === "trash" ? t("gal.empty.trash") : folder.value ? t("gal.empty.folder", { f: folder.value }) : t("gal.empty.none"));
      const badgeIcon = (k: string) => (ICON as Record<string, string>)[k] || "";
      const fmtMeta = (x: { time: number; size: number }) => `${humanTime(x.time)} · ${humanSize(x.size)}`;

      const menuUp = ref(false);
      const toggleMenu = (key: string) => {
        const opening = openMenu.value !== key; openMenu.value = opening ? key : null;
        if (!opening) return; menuUp.value = false;
        void nextTick(() => { const el = document.querySelector<HTMLElement>(".gallery-tile-menu-popup:not(.hidden)"); if (el && el.getBoundingClientRect().bottom > window.innerHeight - 8) menuUp.value = true; });
      };

      // ── 动词：core/verbs（红线兜底在那边）；这里只包 openMenu 收起 + reload ──
      const verbs = createGalleryVerbs({ store: () => { const s = d.store(); if (!s) throw new Error("gallery: no library attached"); return s; }, host: d.host, doc: d.doc, naming, isZipDoc: d.isZipDoc, thumbs: d.thumbs, onEncryptionChanged: invalidateEncrypted, encryption: enc });
      const wrap = <A extends unknown[]>(fn: (...a: A) => Promise<void>) => async (...a: A) => { openMenu.value = null; await fn(...a); await reload(); };
      const rename = wrap((item: GItem) => verbs.rename(item));
      const move = wrap((item: GItem) => verbs.move(item, { folder: folder.value, folderNames: data.folderNames }));
      const copy = wrap((item: GItem) => verbs.copy(item, data.files.map((it) => it.name)));
      const push = wrap((item: GItem) => verbs.push(item));
      const reupload = wrap((item: GItem) => verbs.reupload(item));
      const unload = wrap((item: GItem) => verbs.unload(item));
      const del = wrap((item: GItem) => verbs.del(item));
      const deleteImage = wrap((img: CloudImageItem) => verbs.deleteImage(img));
      const folderDelete = wrap((ft: { name: string; path: string }) => verbs.folderDelete(ft));
      const trashRestore = wrap((item: TrashGItem) => verbs.trashRestore(item));
      const trashPurge = wrap((item: TrashGItem) => verbs.trashPurge(item));
      const emptyTrash = async (scope: "local" | "cloud" | "both" = "both") => { await verbs.emptyTrash(scope); await reload(); };
      const encryptItem = wrap((item: GItem) => verbs.encryptItem(item));
      const decryptItem = wrap((item: GItem) => verbs.decryptItem(item));
      async function onUnlock(name: string) { if (await verbs.unlock(name)) await reload(); }

      async function openTile(item: GItem) {
        openMenu.value = null;
        if (item.name === d.host.activeName()) { await d.doc.open(item); return; }
        await d.doc.open(item); await reload();
      }
      function enterFolder(path: string) { setFolder(path); }
      async function openImageTile(img: CloudImageItem) {
        openMenu.value = null;
        if (!d.doc.importImageAsDoc) return;   // 宿主不支持图片转生 → 图片 tile 只显示
        const twin = imageTwinBareName(folder.value, img.name);
        const existing = data.files.find((it) => it.name === twin);
        if (existing) { await d.doc.open(existing); return; }
        const st = d.store();
        if (st && await st.files.nameOccupied(naming.full(twin))) { await d.doc.open({ name: twin, local: null, cloud: null, dirty: false, ghost: false, pendingGone: false } as GItem); return; }
        try {
          const blob = await d.host.busy(t("cp.downloading", { name: img.name }), () => d.data.openCloudImage(img.path));
          if (!blob) { d.host.status(t("cp.downloadFailed", { name: img.name }), true); return; }
          await d.doc.importImageAsDoc(new File([blob], img.name, { type: mimeForImageName(img.name) }), { nameOverride: twin });
        } catch (e: unknown) { d.host.status(t("cp.importFailed", { err: String((e as { message?: unknown })?.message || e) }), true); }
      }

      const L = {
        activeTag: t("gal.tile.active"),
        loading: t("gal.loading"), folder: t("gal.folder"), emptyFolder: t("gal.emptyFolder"), more: t("gal.more"),
        delEmptyFolder: t("gal.delEmptyFolder"), delFolderNonEmpty: t("gal.delFolderNonEmpty"), encrypted: t("enc.locked.aria"),
        divergedNote: t("gal.divergedNote"), renameKeep: t("gal.renameKeep"), discardToTrash: t("gal.discardToTrash"),
        rename: t("gal.rename"), moveTo: t("gal.moveTo"), copy: t("gal.copy"), pullLocal: t("gal.pullLocal"),
        pushCloud: t("gal.pushCloud"), unloadLocal: t("gal.unloadLocal"), encrypt: t("menu.encrypt"), decrypt: t("menu.decrypt"),
        toTrash: t("gal.toTrash"), deleted: t("gal.deleted"), restore: t("gal.restore"), purge: t("gal.purge"),
        reupload: t("gal.reupload"), imageFile: t("gal.imageFile"), otherFile: t("gal.otherFile"),
        retry: t("gal.retry"), openDiag: t("gal.openDiag"), reload: t("gal.reload"),
      };
      const tileTall = d.tile?.aspect === "2/3";
      return {
        tileTall, hasThumb,
        view, folder, loading, stalled, retry, openDiag, reloadApp, openMenu, isEmpty, emptyText, L, phHtml,
        folderTiles, fileTiles, imageTiles, otherTiles, trashTiles, crumbs,
        badgeIcon, fmtMeta, ICON, toggleMenu, menuUp, invalidateEncrypted, setFolder, hydrateFolder, enterFolder,
        openTile, openImageTile, deleteImage, rename, move, copy, push, reupload, unload, del, folderDelete, trashRestore, trashPurge, emptyTrash,
        encryptItem, decryptItem, onUnlock, requestUnlock, hasEncryption: !!enc,
        reload, setView: (v: "files" | "trash") => { view.value = v; void reload(); },
      };
    },
    template: GALLERY_TEMPLATE,
  });

  const app = createApp(Gallery);
  const vm = app.mount(el) as unknown as GalleryVM;
  return {
    refresh: () => vm.reload(), setView: (v) => vm.setView(v), getView: () => vm.view,
    setFolder: (p) => vm.setFolder(p), hydrateFolder: (p) => vm.hydrateFolder(p), getFolder: () => vm.folder,
    emptyTrash: (scope) => vm.emptyTrash(scope), requestUnlock: () => vm.requestUnlock(), invalidateEncrypted: (name) => vm.invalidateEncrypted(name),
    unmount: () => app.unmount(),
  };
}

// 模板逐字自 WeebPaint gallery.ts v0.14.9（class 名不变，宿主 CSS 直接生效）；唯一增补：加密菜单项加 v-if="hasEncryption"。
const GALLERY_TEMPLATE = `
      <div class="gallery-breadcrumb" :class="{ hidden: view==='trash' || !folder }" v-if="view!=='trash'">
        <template v-for="(c,i) in crumbs" :key="c.path">
          <span v-if="i>0" class="sep">›</span>
          <button type="button" :class="{ current: c.current }" @click="!c.current && setFolder(c.path)">{{ c.label }}</button>
        </template>
      </div>

      <div class="gallery-grid" :class="{ tall: tileTall }" v-show="!isEmpty || loading">
        <div v-if="loading" class="gallery-loading">
          <template v-if="!stalled">{{ L.loading }}</template>
          <template v-else>
            <div class="gallery-stalled">{{ stalled }}</div>
            <div class="gallery-stalled-actions">
              <button type="button" class="sheet-action ghost gallery-retry-btn" @click="retry">{{ L.retry }}</button>
              <button type="button" class="sheet-action ghost" @click="openDiag">{{ L.openDiag }}</button>
              <button type="button" class="sheet-action ghost" @click="reloadApp">{{ L.reload }}</button>
            </div>
          </template>
        </div>

        <template v-if="view==='files' && !loading">
          <div v-for="ft in folderTiles" :key="'F:'+ft.path" class="gallery-tile folder" @click="enterFolder(ft.path)">
            <div class="gallery-tile-thumb" v-html="ICON.folder"></div>
            <div class="gallery-tile-name-row">
              <div class="gallery-tile-name" :title="ft.path">{{ ft.name }}</div>
              <div class="gallery-tile-meta">{{ L.folder }}</div>
            </div>
            <button type="button" class="gallery-tile-menu-btn" :aria-label="L.more" @click.stop="toggleMenu('F:'+ft.path)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#more"/></svg></button>
            <div class="gallery-tile-menu-popup" :class="{ hidden: openMenu!=='F:'+ft.path, up: menuUp }" @click.stop>
              <button type="button" class="danger" @click="folderDelete(ft)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#trash-can"/></svg><span>{{ L.delEmptyFolder }}</span></button>
            </div>
          </div>

          <div v-for="row in fileTiles" :key="row.t.name" class="gallery-tile" :class="{ active: row.t.isActive }" @click="openTile(row.item)">
            <ThumbCell :local-thumb="row.t.hasLocalThumb ? row.item.local.thumb : null" :enc-name="row.t.encrypted && hasThumb(row.t.name) ? row.t.name : null" :fetchable="!row.t.encrypted && (!!row.t.cloud || !!row.item.local) && hasThumb(row.t.name)" :is-cloud="!row.item.local && !!row.t.cloud" :cloud-newer="!!row.item.cloudNewer" :thumb-token="String(row.item.local ? (row.item.local.updatedAt||0) : (row.t.cloud && row.t.cloud.lastModifiedDateTime || row.t.size || 0))" :fallback="row.t.displayName.slice(0,1) || '?'" :fallback-html="phHtml(row.t.name)" :alt="row.t.name" @unlock="onUnlock" />
            <div class="gallery-tile-name-row">
              <span v-if="row.t.isActive" class="gallery-tile-active-tag">{{ L.activeTag }}</span>
              <div class="gallery-tile-name" :title="row.t.fullPath">{{ row.t.displayName }}</div>
              <div class="gallery-tile-meta">
                <span v-if="row.t.encrypted" class="gallery-tile-state-icon enc" :title="L.encrypted" v-html="ICON.lock"></span>
                <span :class="'gallery-tile-state-icon b-' + row.t.badge" :title="row.t.badgeTitle" v-html="badgeIcon(row.t.badge)"></span>
                <span>{{ fmtMeta(row.t) }}</span>
              </div>
            </div>
            <button type="button" class="gallery-tile-menu-btn" :aria-label="L.more" @click.stop="toggleMenu(row.t.name)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#more"/></svg></button>
            <div class="gallery-tile-menu-popup" :class="{ hidden: openMenu!==row.t.name, up: menuUp }" @click.stop>
              <template v-if="row.t.ghost">
                <div class="gallery-menu-note">{{ L.divergedNote }}</div>
                <button type="button" @click="rename(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#rename"/></svg><span>{{ L.renameKeep }}</span></button>
                <button type="button" class="danger" @click="del(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#trash-can"/></svg><span>{{ L.discardToTrash }}</span></button>
              </template>
              <template v-else-if="row.t.pendingGone">
                <button type="button" @click="reupload(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#upload"/></svg><span>{{ L.reupload }}</span></button>
                <button type="button" class="danger" @click="del(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#trash-can"/></svg><span>{{ L.toTrash }}</span></button>
              </template>
              <template v-else>
                <button type="button" @click="rename(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#rename"/></svg><span>{{ L.rename }}</span></button>
                <button type="button" @click="move(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#move-to-folder"/></svg><span>{{ L.moveTo }}</span></button>
                <button type="button" @click="copy(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#copy"/></svg><span>{{ L.copy }}</span></button>
                <button v-if="row.t.badge==='cloudOnly'" type="button" @click="openTile(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#download"/></svg><span>{{ L.pullLocal }}</span></button>
                <button v-if="row.t.badge==='localOnly' || row.t.badge==='float'" type="button" @click="push(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#cloud-upload"/></svg><span>{{ L.pushCloud }}</span></button>
                <button v-if="row.t.badge==='dirtyBoth' || row.t.badge==='conflictBoth'" type="button" @click="push(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#cloud-upload"/></svg><span>{{ L.pushCloud }}</span></button>
                <button v-if="row.item.local && row.item.cloud" type="button" @click="unload(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#unload-local-cache"/></svg><span>{{ L.unloadLocal }}</span></button>
                <button v-if="hasEncryption && row.item.local && !row.t.encrypted" type="button" @click="encryptItem(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#lock"/></svg><span>{{ L.encrypt }}</span></button>
                <button v-if="hasEncryption && row.item.local && row.t.encrypted" type="button" @click="decryptItem(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#unlock"/></svg><span>{{ L.decrypt }}</span></button>
                <button type="button" class="danger" @click="del(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#trash-can"/></svg><span>{{ L.toTrash }}</span></button>
              </template>
            </div>
          </div>

          <div v-for="im in imageTiles" :key="'I:'+im.path" class="gallery-tile image-file" @click="openImageTile(im.raw)">
            <ImageThumbCell :path="im.path" :token="im.token" :fallback="im.name.slice(0,1) || '?'" :alt="im.name" />
            <div class="gallery-tile-name-row">
              <div class="gallery-tile-name" :title="im.path">{{ im.name }}</div>
              <div class="gallery-tile-meta">
                <span class="gallery-tile-state-icon" :title="L.imageFile" v-html="ICON.image"></span>
                <span>{{ fmtMeta({ time: im.time, size: im.size }) }}</span>
              </div>
            </div>
            <button type="button" class="gallery-tile-menu-btn" :aria-label="L.more" @click.stop="toggleMenu('I:'+im.path)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#more"/></svg></button>
            <div class="gallery-tile-menu-popup" :class="{ hidden: openMenu!=='I:'+im.path, up: menuUp }" @click.stop>
              <button type="button" class="danger" @click="deleteImage(im.raw)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#trash-can"/></svg><span>{{ L.toTrash }}</span></button>
            </div>
          </div>
          <div v-for="ot in otherTiles" :key="'O:'+ot.path" class="gallery-tile other-file">
            <div class="gallery-tile-thumb" v-html="ICON.file"></div>
            <div class="gallery-tile-name-row">
              <div class="gallery-tile-name" :title="ot.path">{{ ot.name }}</div>
              <div class="gallery-tile-meta">
                <span class="gallery-tile-state-icon" :title="L.otherFile" v-html="ICON.file"></span>
                <span>{{ fmtMeta({ time: ot.time, size: ot.size }) }}</span>
              </div>
            </div>
          </div>
        </template>

        <template v-if="view==='trash' && !loading">
          <div v-for="row in trashTiles" :key="row.t.name + row.t.deletedAt" class="gallery-tile">
            <ThumbCell :local-thumb="row.t.hasLocalThumb ? row.item.local.thumb : null" :fetchable="!row.t.encrypted && (!!row.t.cloud || !!row.item.local)" :is-cloud="!row.item.local && !!row.t.cloud" :thumb-token="String(row.item.local ? (row.item.local.updatedAt||0) : (row.t.cloud && row.t.cloud.lastModifiedDateTime || row.t.size || 0))" :fallback="row.t.name.slice(0,1) || '?'" :fallback-html="phHtml(row.t.name)" :alt="row.t.name" />
            <div class="gallery-tile-name-row">
              <div class="gallery-tile-name" :title="row.t.name">{{ row.t.name }}</div>
              <div class="gallery-tile-meta">{{ row.t.source }} · {{ fmtMeta({time: row.t.deletedAt, size: 0}).split(' · ')[0] }} {{ L.deleted }}</div>
            </div>
            <button type="button" class="gallery-tile-menu-btn" :aria-label="L.more" @click.stop="toggleMenu('T:'+row.t.name+row.t.deletedAt)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#more"/></svg></button>
            <div class="gallery-tile-menu-popup" :class="{ hidden: openMenu!=='T:'+row.t.name+row.t.deletedAt, up: menuUp }" @click.stop>
              <button type="button" @click="trashRestore(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#restore-trash"/></svg><span>{{ L.restore }}</span></button>
              <button type="button" class="danger" @click="trashPurge(row.item)"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#trash-can"/></svg><span>{{ L.purge }}</span></button>
            </div>
          </div>
        </template>
      </div>

      <div class="gallery-empty" v-show="isEmpty && !loading">{{ emptyText }}</div>
`;
