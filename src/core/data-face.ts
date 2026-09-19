// 图库数据面（WET 自 WeebPaint src/app-store.ts 的图库段，2026-09-09）：store.Item → GItem；当前夹订阅的路由 + 排序；回收站映射。
// 库唯一列举面 = store.files.watchFolder（订阅当前夹）；⛔ 永不 list 全库（WeebPaint 2026-07-12 删 listGallery 的判决）。
// 扩展名知识来自 policy（默认 = cloud-image-model 的 WeebPaint 白名单）；裸名↔全名边界来自 policy.naming（默认恒等）。
import { isCached, isDirty, type Item, type SyncState, type TrashItem, type WatchFolderErrorPhase } from "@internal/store";
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
  /** 0.3.0：这些路径连杂物都不显示（JRB：v1 遗留 session.json / library.json、写入方半成品 *.part / ~* / .tmp）。不给 = 全显示。
   *  放数据面而不是宿主过滤：帧是包算的，宿主拿不到「others」那一列。 */
  hide?: (path: string) => boolean;
}
const IDENTITY: NameBoundary = { bare: (s) => s, full: (b) => b };
const _CLOUD_STATES = new Set<SyncState>(["cloud-only", "synced", "unpushed", "newer-on-cloud", "conflict"]);

/** store.Item{path,syncState} → GItem（gallery-view-model 的输入；全部派生自 syncState，不重推导）。 */
export function galleryItemFromStoreItem(it: Item, naming: NameBoundary = IDENTITY): GItem {
  const name = naming.bare(it.path);
  return {
    name,
    local: isCached(it.syncState) ? { name, size: it.size, updatedAt: it.lastModified } : null,
    cloud: _CLOUD_STATES.has(it.syncState) ? { path: it.path, name, size: it.size, lastModifiedDateTime: it.lastModified ? new Date(it.lastModified).toISOString() : undefined } : null,
    dirty: isDirty(it.syncState),
    ghost: it.syncState === "ghost",
    pendingGone: it.syncState === "pendingGone",
    // 云端字节比本地新 → 缩略图必须走 source:"cloud"（QA 2026-08-21「新 token 配旧字节」根修）
    cloudNewer: it.syncState === "newer-on-cloud" || it.syncState === "conflict",
    newerOnCloud: it.syncState === "newer-on-cloud",
    conflict: it.syncState === "conflict",
  };
}

export function createGalleryDataFace(deps: { store: () => DataFaceStore | null; policy?: DataFacePolicy }) {
  const isDoc = deps.policy?.isDoc ?? isDocPath, isImage = deps.policy?.isImage ?? isImagePath, naming = deps.policy?.naming ?? IDENTITY;
  const hide = deps.policy?.hide ?? (() => false);
  const visible = (items: Item[]): Item[] => items.filter((it) => !hide(it.path));
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
      return requireStore().files.watchFolder(folder, (snap) => { const items = visible(snap.items); cb({
        path: snap.path,
        items: items.filter((it) => isDoc(it.path)).map((it) => galleryItemFromStoreItem(it, naming)).sort((a, b) => naturalCompare(b.name, a.name)),
        images: toImageItems(items),
        others: toOtherItems(items),
        folderNames: folderNamesOf(folder, snap.folders),
      }); }, opts);
    },
    watchFolderImages(folder: string, cb: (snap: { path: string; images: CloudImageItem[]; folderNames: string[] }) => void): () => void {
      return requireStore().files.watchFolder(folder, (snap) => cb({ path: snap.path, images: toImageItems(visible(snap.items)), folderNames: folderNamesOf(folder, snap.folders) }));
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
