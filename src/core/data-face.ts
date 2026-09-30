// 图库数据面（WET 自 WeebPaint src/app-store.ts 的图库段，2026-09-09）：store.Item → GItem；当前夹订阅的路由 + 排序；搁置区（回收站 / 备份箱）映射。
// 库唯一列举面 = store.files.watchFolder（订阅当前夹）；⛔ 永不 list 全库（WeebPaint 2026-07-12 删 listGallery 的判决）。
// 0.6.0：哪些是文档、主干是什么、种类是什么全由 store.identifiers 说（宿主在 createStore 报的 docKinds 表）；本包不再收 isDoc / naming 钩子。
//   图片（WeebPaint 的云盘图片）仍是本包的策略（policy.isImage）：它们不是文档，store 不认识。
import { isCached, type Item, type TrashItem, type Identifiers, type WatchFolderErrorPhase } from "@internal/store";
import type { GItem } from "./model/gallery-view-model.ts";
import { ASIDE, asideItemFrom, sortAside, type AsideItem, type AsideKind } from "./model/aside.ts";
import { isImagePath } from "./model/cloud-image-model.ts";
import { naturalCompare } from "./model/natural-order.ts";

/** 不是文档的文件（图片 / 杂物）：identifier = 身份；label = 最后一段（给人看）。 */
export interface CloudOtherItem { identifier: string; label: string; size?: number; lastModified?: number; }
export interface CloudImageItem { identifier: string; label: string; size?: number; lastModified?: number; cached: boolean; }
export interface GallerySnapshot { folder: string; items: GItem[]; images: CloudImageItem[]; others: CloudOtherItem[]; folderNames: string[]; }

/** 数据面能看见的 store 子集（多库切换后实例会变，所以是 getter）。 */
export interface DataFaceStore {
  identifiers: Identifiers;
  files: {
    watchFolder(folder: string, cb: (snap: { folder: string; items: Item[]; folders: string[]; complete: boolean }) => void, opts?: { onError?: (err: unknown, phase: WatchFolderErrorPhase) => void }): () => void;
    listTrash(): Promise<TrashItem[]>;
    listBackup(): Promise<TrashItem[]>;
  };
  file(identifier: string, opts: { mode: "existing" }): { open(): Promise<Blob | null> };
}
export interface DataFacePolicy {
  /** 不是文档的文件里哪些算图片（默认 = 浏览器可解码集）。 */
  isImage?: (identifier: string) => boolean;
  // （0.3.0 的 hide 0.3.2 撤：「夹里有什么」是 store 列举面的事——`createStore({ hidden })`，本包不再过滤。
  //   0.6.0：isDoc / naming 也撤——「哪些是文档、主干是什么」是 store.identifiers 的事。）
}
const basename = (p: string) => p.slice(p.lastIndexOf("/") + 1);

/** store.Item → GItem：切开身份取主干和种类 + **syncState 原样透传**（0.4.0：不派生 local/cloud/dirty… 布尔；状态的唯一源在 store）。不是文档 → null。 */
export function galleryItemFromStoreItem(it: Item, ids: Identifiers): GItem | null {
  const d = ids.parse(it.identifier);
  if (!d) return null;
  const g: GItem = { identifier: it.identifier, stem: d.stem, kind: d.kind, syncState: it.syncState };
  if (it.size != null) g.size = it.size;
  if (it.lastModified != null) g.lastModified = it.lastModified;
  return g;
}

export function createGalleryDataFace(deps: { store: () => DataFaceStore | null; policy?: DataFacePolicy }) {
  const isImage = deps.policy?.isImage ?? isImagePath;

  const requireStore = (): DataFaceStore => { const s = deps.store(); if (!s) throw new Error("gallery data face: no library attached"); return s; };
  const toImageItems = (items: Item[], ids: Identifiers): CloudImageItem[] => items
    .filter((it) => !ids.parse(it.identifier) && isImage(it.identifier))
    .map((it) => ({ identifier: it.identifier, label: basename(it.identifier), size: it.size, lastModified: it.lastModified, cached: isCached(it.syncState) }))
    .sort((a, b) => (b.lastModified ?? 0) - (a.lastModified ?? 0) || naturalCompare(b.label, a.label));
  const toOtherItems = (items: Item[], ids: Identifiers): CloudOtherItem[] => items
    .filter((it) => !ids.parse(it.identifier) && !isImage(it.identifier))
    .map((it) => ({ identifier: it.identifier, label: basename(it.identifier), size: it.size, lastModified: it.lastModified }))
    .sort((a, b) => naturalCompare(a.label, b.label));
  const folderNamesOf = (folder: string, folders: string[]) => { const prefix = folder ? `${folder}/` : ""; return folders.map((f) => f.slice(prefix.length)).filter(Boolean).sort(naturalCompare); };
  return {
    /** 订阅当前夹：立即本地帧、云端到了同一 cb 再闪。文档按主干 natural 倒序；图片按修改时间倒序；杂物显示不打开；子夹自然正序。 */
    watchFolder(folder: string, cb: (snap: GallerySnapshot) => void, opts?: { onError?: (err: unknown, phase: WatchFolderErrorPhase) => void }): () => void {
      const st = requireStore(), ids = st.identifiers;
      return st.files.watchFolder(folder, (snap) => cb({
        folder: snap.folder,
        items: snap.items.map((it) => galleryItemFromStoreItem(it, ids)).filter((g): g is GItem => g != null).sort((a, b) => naturalCompare(b.stem, a.stem) || naturalCompare(b.identifier, a.identifier)),
        images: toImageItems(snap.items, ids),
        others: toOtherItems(snap.items, ids),
        folderNames: folderNamesOf(folder, snap.folders),
      }), opts);
    },
    watchFolderImages(folder: string, cb: (snap: { folder: string; images: CloudImageItem[]; folderNames: string[] }) => void): () => void {
      const st = requireStore(), ids = st.identifiers;
      return st.files.watchFolder(folder, (snap) => cb({ folder: snap.folder, images: toImageItems(snap.items, ids), folderNames: folderNamesOf(folder, snap.folders) }));
    },
    openCloudImage: (identifier: string): Promise<Blob | null> => requireStore().file(identifier, { mode: "existing" }).open(),
    /** 搁置区（0.5.0；回收站 / 备份箱同一个面）：store 两端聚合的 TrashItem[] → AsideItem（只元数据，无 blob），新的在前。
     *  读哪个列表由 ASIDE 表定；列表只来自 store，宿主没有注入口。 */
    listAside: async (box: AsideKind): Promise<AsideItem[]> => {
      const st = requireStore();
      return sortAside((await ASIDE[box].list(st.files)).map((it) => asideItemFrom(box, it, st.identifiers)), naturalCompare);
    },
  };
}
export type GalleryDataFace = ReturnType<typeof createGalleryDataFace>;
