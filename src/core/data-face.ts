// 图库数据面（WET 自 WeebPaint src/app-store.ts 的图库段，2026-09-09）：store.Item → GItem；当前夹订阅的路由 + 排序；回收站映射。
// 库唯一列举面 = store.files.watchFolder（订阅当前夹）；⛔ 永不 list 全库（WeebPaint 2026-07-12 删 listGallery 的判决）。
// 扩展名知识来自 policy（默认 = cloud-image-model 的 WeebPaint 白名单）；裸名↔全名边界来自 policy.naming（默认恒等）。
import { isCached, type Item, type TrashItem, type WatchFolderErrorPhase } from "@internal/store";
import type { GItem, TrashGItem } from "./model/gallery-view-model.ts";
import type { NameBoundary } from "./model/gallery-model.ts";
import { isDocPath, isImagePath } from "./model/cloud-image-model.ts";
import { naturalCompare } from "./model/natural-order.ts";

export interface CloudOtherItem { path: string; name: string; size?: number; lastModified?: number; }
export interface CloudImageItem { path: string; name: string; size?: number; lastModified?: number; cached: boolean; }
export interface GallerySnapshot { path: string; items: GItem[]; images: CloudImageItem[]; others: CloudOtherItem[]; folderNames: string[]; }

/** 数据面能看见的 store 子集（多库切换后实例会变，所以是 getter）。 */
export interface DataFaceStore {
  files: {
    watchFolder(folder: string, cb: (snap: { path: string; items: Item[]; folders: string[]; complete: boolean }) => void, opts?: { onError?: (err: unknown, phase: WatchFolderErrorPhase) => void }): () => void;
    listTrash(): Promise<TrashItem[]>;
  };
  file(name: string, opts: { isZip: false; mode: "existing" }): { open(): Promise<Blob | null> };
}
export interface DataFacePolicy {
  isDoc?: (path: string) => boolean;
  isImage?: (path: string) => boolean;
  naming?: NameBoundary;
  // （0.3.0 的 hide 0.3.2 撤：「夹里有什么」是 store 列举面的事——`createStore({ hiddenName })`（store 0.14.0），本包不再过滤。）
}
const IDENTITY: NameBoundary = { bare: (s) => s, full: (b) => b };

/** store.Item{path,syncState,size,lastModified} → GItem：裸名 + **syncState 原样透传**（0.4.0：不再派生 local/cloud/dirty… 布尔；状态的唯一源在 store）。 */
export function galleryItemFromStoreItem(it: Item, naming: NameBoundary = IDENTITY): GItem {
  const g: GItem = { name: naming.bare(it.path), syncState: it.syncState };
  if (it.size != null) g.size = it.size;
  if (it.lastModified != null) g.lastModified = it.lastModified;
  return g;
}

export function createGalleryDataFace(deps: { store: () => DataFaceStore | null; policy?: DataFacePolicy }) {
  const isDoc = deps.policy?.isDoc ?? isDocPath, isImage = deps.policy?.isImage ?? isImagePath, naming = deps.policy?.naming ?? IDENTITY;

  const requireStore = (): DataFaceStore => { const s = deps.store(); if (!s) throw new Error("gallery data face: no library attached"); return s; };
  const toImageItems = (items: Item[]): CloudImageItem[] => items
    .filter((it) => isImage(it.path))
    .map((it) => ({ path: it.path, name: it.path.split("/").pop() || it.path, size: it.size, lastModified: it.lastModified, cached: isCached(it.syncState) }))
    .sort((a, b) => (b.lastModified ?? 0) - (a.lastModified ?? 0) || naturalCompare(b.name, a.name));
  const toOtherItems = (items: Item[]): CloudOtherItem[] => items
    .filter((it) => !isDoc(it.path) && !isImage(it.path))
    .map((it) => ({ path: it.path, name: it.path.split("/").pop() || it.path, size: it.size, lastModified: it.lastModified }))
    .sort((a, b) => naturalCompare(a.name, b.name));
  const folderNamesOf = (folder: string, folders: string[]) => { const prefix = folder ? `${folder}/` : ""; return folders.map((f) => f.slice(prefix.length)).filter(Boolean).sort(naturalCompare); };
  return {
    /** 订阅当前夹：立即本地帧、云端到了同一 cb 再闪。文档 natural 倒序；图片按修改时间倒序；杂物显示不打开；子夹自然正序。 */
    watchFolder(folder: string, cb: (snap: GallerySnapshot) => void, opts?: { onError?: (err: unknown, phase: WatchFolderErrorPhase) => void }): () => void {
      return requireStore().files.watchFolder(folder, (snap) => cb({
        path: snap.path,
        items: snap.items.filter((it) => isDoc(it.path)).map((it) => galleryItemFromStoreItem(it, naming)).sort((a, b) => naturalCompare(b.name, a.name)),
        images: toImageItems(snap.items),
        others: toOtherItems(snap.items),
        folderNames: folderNamesOf(folder, snap.folders),
      }), opts);
    },
    watchFolderImages(folder: string, cb: (snap: { path: string; images: CloudImageItem[]; folderNames: string[] }) => void): () => void {
      return requireStore().files.watchFolder(folder, (snap) => cb({ path: snap.path, images: toImageItems(snap.items), folderNames: folderNamesOf(folder, snap.folders) }));
    },
    openCloudImage: (path: string): Promise<Blob | null> => requireStore().file(path, { isZip: false, mode: "existing" }).open(),
    /** 回收站：store 两端聚合的 TrashItem[] → TrashGItem（只元数据，无 blob）。 */
    listTrash: async (): Promise<TrashGItem[]> => (await requireStore().files.listTrash()).map((it) => ({
      name: naming.bare(it.name),
      deletedAt: 0,
      encrypted: it.encrypted,
      conflictLive: it.conflictLive,
      local: it.localKey ? { name: naming.bare(it.name), trashKey: it.localKey, encrypted: it.encrypted } : null,
      cloud: it.cloudRef ? { path: it.name, id: it.cloudRef } : null,
    })),
  };
}
export type GalleryDataFace = ReturnType<typeof createGalleryDataFace>;
