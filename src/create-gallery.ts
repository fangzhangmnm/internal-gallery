// createGallery(deps) —— 总装（提案 §0）：四样注入（store / DocHost / UI 原子 / t）+ 政策 → 数据面 + 缩略图缓存 + 屏幕 + 壳流。
// 宿主仍拥有 chrome 标记（按钮/弹层/底栏）与库管理面（0.1 决定，提案 §3 回写）；本包出 core 器官 + 屏幕 + headless 流。
import { createGalleryDataFace, type DataFaceStore, type DataFacePolicy } from "./core/data-face.ts";
import { createThumbCache, thumbKeyFor, type ThumbCache, type ThumbSource } from "./core/thumbs/thumb-cache.ts";
import { memoryThumbStore, idbThumbStore, type ThumbStore } from "./core/thumbs/thumb-store.ts";
import { configureText, type GalleryTextKey, type GalleryLang } from "./core/text.ts";
import { configureDeviceKv, type DeviceKv } from "./core/device-kv.ts";
import { mountGalleryScreen, type GalleryScreenDeps, type GalleryHandle } from "./ui/gallery-screen.ts";
import type { VerbStore } from "./core/verbs.ts";
import type { NameBoundary } from "./core/model/gallery-model.ts";

export interface CreateGalleryDeps extends Omit<GalleryScreenDeps, "data" | "thumbs" | "store"> {
  store: () => (VerbStore & DataFaceStore) | null;
  policy: DataFacePolicy & {
    naming?: NameBoundary;
    /** 缩略图：不给 = 无缩略图（WXHW 2.0）。peek 从 store getPeek 读 app 域 entry（WeebPaint: Thumbnails/thumbnail.png）。 */
    thumbs?: { /** null = 确定没有缩略图（进缓存、显示占位）；抛 = 未知（不缓存；云端-only 显示云）。 */ fetch: (name: string, source: ThumbSource) => Promise<Blob | null>; store?: ThumbStore; dbName?: string; galleryId?: () => string; /** 0.2.1：哪些文档有缩略图可取（WXHW：只有书）。 */ has?: (fullName: string) => boolean };
  };
  text?: { t?: (key: GalleryTextKey, params?: Record<string, string | number>) => string | null | undefined; lang?: GalleryLang };
  deviceKv?: DeviceKv;
}
export interface Gallery { handle: GalleryHandle; data: ReturnType<typeof createGalleryDataFace>; thumbs: ThumbCache | null; }

export function createGallery(el: HTMLElement, deps: CreateGalleryDeps): Gallery {
  if (deps.text) configureText(deps.text);
  if (deps.deviceKv) configureDeviceKv(deps.deviceKv);
  const naming = deps.policy.naming ?? deps.naming;
  const data = createGalleryDataFace({ store: deps.store, policy: { ...deps.policy, naming } });
  let thumbs: ThumbCache | null = null;
  if (deps.policy.thumbs) {
    const tp = deps.policy.thumbs;
    const store = tp.store ?? (typeof indexedDB !== "undefined" && tp.dbName ? idbThumbStore({ dbName: tp.dbName, storeName: "gallery-thumbs" }) : memoryThumbStore());
    const full = naming?.full ?? ((b: string) => b);
    thumbs = createThumbCache({ store, fetch: tp.fetch, keyOf: (name) => thumbKeyFor(tp.galleryId?.() ?? "default", full(name)), report: (e) => deps.reportError(e, "log") });
  }
  const handle = mountGalleryScreen(el, { ...deps, naming, store: deps.store, data, thumbs: thumbs ?? undefined, hasThumb: deps.hasThumb ?? deps.policy.thumbs?.has });
  return { handle, data, thumbs };
}
