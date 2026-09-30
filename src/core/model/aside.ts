// 搁置区（aside）= 回收站 + 备份箱。created 2026-09-29 by Claude Fable 5.1
//
// 两者在 store 里是同一个东西：被挪到一边的文件（删除 → .trash；冲突里被换下的那一版 → .backup），
//   同一个 TrashItem 形状、同一对 restoreTrash / purgeTrash（store 内部 = aggregateBox("trash" | "backup")）。
//   只差三处：读哪个列表、清空调哪个函数、文案 / 缩略图来源。**这三处差异全在下面 ASIDE 这一张表里**，
//   别处不许再写 `kind === "backup"` 分支（user 2026-09-29「回收站和备份箱是否应该抽象一下？关键在于不要引入会导致代码混淆的滥用和monkey patch」）。
//
// 纪律：
//   · 每个 item 自带 kind——恢复 / 彻底删从 item 读，不看「当前正开着哪个视图」。
//   · 列表只来自 store（store.files.listTrash / listBackup）；宿主不能注入自己的列表，也没有这个口子。
//   · 本包只画、只发起；字节、留底时机、撞名怎么改名全是 store 的事。
import type { TrashItem, Identifiers } from "@internal/store";
import type { GalleryTextKey } from "../text.ts";

export type AsideKind = "trash" | "backup";
export type AsideScope = "local" | "cloud" | "both";

/** 搁置区的一行（只元数据，无字节）。 */
export interface AsideItem {
  /** 在哪个箱子里（回收站 / 备份箱）。0.6.0 起叫 box（原 kind——kind 让给了文档种类）。 */
  box: AsideKind;
  /** 列表内唯一（同名可以有很多条：同一份稿留过好几版底）。 */
  key: string;
  /** 身份 = 恢复目标（0.6.0 起叫 identifier，原 name）。 */
  identifier: string;
  /** 主干（文档）或最后一段（非文档，如被删的图片）。 */
  stem: string;
  /** 文档种类；不是文档 → null。 */
  kind: string | null;
  /** 挪到一边的时刻（ms）；解析不出 = 0。 */
  at: number;
  side: "local" | "cloud" | "both";
  localKey: string | null;
  cloudRef: string | null;
  /** 云端字节是加密容器（恢复时落加密名）。 */
  encrypted: boolean;
  /** 只回收站：离线删被「编辑赢」撤销 → 本地回收站有、云端还活着（两存，界面要说）。备份箱恒 false。 */
  conflictLive: boolean;
}

export interface AsideEmptyResult { failed?: { where?: string }[] }
/** 表里的函数能看见的 store.files 子集。 */
export interface AsideFiles {
  listTrash(): Promise<TrashItem[]>;
  listBackup(): Promise<TrashItem[]>;
  emptyTrash(o: { scope: AsideScope }): Promise<AsideEmptyResult>;
  emptyBackup(o: { scope: AsideScope }): Promise<AsideEmptyResult>;
}

export interface AsideSpec {
  list(files: Pick<AsideFiles, "listTrash" | "listBackup">): Promise<TrashItem[]>;
  empty(files: Pick<AsideFiles, "emptyTrash" | "emptyBackup">, scope: AsideScope): Promise<AsideEmptyResult>;
  /** 缩略图从哪来。"by-name" = 按身份走缩略图缓存（回收站：原名通常已经没有活文件，缓存里是删之前那张）；
   *  "none" = 不取（备份箱：原名的活文件几乎总在，按名字取到的是**现在那一版**的图，当成留底那一版的图就是骗人）。 */
  thumb: "by-name" | "none";
  text: {
    /** 空列表。 */ none: GalleryTextKey;
    /** 卡片副行里跟在时间后面的那个词（「删除」/「留底」）。 */ at: GalleryTextKey;
    emptyTitle: GalleryTextKey; emptyMsg: GalleryTextKey; emptyBusy: GalleryTextKey;
    emptyDone: GalleryTextKey; emptyNeedLogin: GalleryTextKey; emptyCloudFail: GalleryTextKey; emptyPartial: GalleryTextKey;
  };
}

/** 唯一的差异表。**不从包门牌导出**（宿主够不着），并且冻结——谁也不能在运行时改它。 */
export const ASIDE: { readonly [K in AsideKind]: Readonly<AsideSpec> } = deepFreeze({
  trash: {
    list: (f) => f.listTrash(),
    empty: (f, scope) => f.emptyTrash({ scope }),
    thumb: "by-name",
    text: {
      none: "gal.empty.trash", at: "gal.deleted",
      emptyTitle: "gal.dlg.emptyTrashTitle", emptyMsg: "gal.dlg.emptyTrashMsg", emptyBusy: "gal.busy.emptyTrash",
      emptyDone: "gal.st.emptyTrashDone", emptyNeedLogin: "gal.st.emptyTrashCloudNeedLogin",
      emptyCloudFail: "gal.st.emptyTrashCloudFail", emptyPartial: "gal.st.emptyTrashPartial",
    },
  },
  backup: {
    list: (f) => f.listBackup(),
    empty: (f, scope) => f.emptyBackup({ scope }),
    thumb: "none",
    text: {
      none: "gal.empty.backup", at: "gal.keptAside",
      emptyTitle: "gal.dlg.emptyBackupTitle", emptyMsg: "gal.dlg.emptyBackupMsg", emptyBusy: "gal.busy.emptyBackup",
      emptyDone: "gal.st.emptyBackupDone", emptyNeedLogin: "gal.st.emptyBackupCloudNeedLogin",
      emptyCloudFail: "gal.st.emptyBackupCloudFail", emptyPartial: "gal.st.emptyBackupPartial",
    },
  },
});
function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object") { for (const v of Object.values(o as object)) deepFreeze(v); Object.freeze(o); }
  return o;
}

/** store 的搁置戳 `yyyymmddhhmmss` → ms；解析不出 → 0。
 *  戳是打戳那台设备的本地钟点、不带时区；这里按本机时区读——跨时区的设备会差几个小时，只用于展示和排序，不参与任何内容决策。 */
export function asideTime(ts: string | null | undefined): number {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(ts ?? "");
  if (!m) return 0;
  const n = m.slice(1).map(Number) as [number, number, number, number, number, number];
  if (n[1] < 1 || n[1] > 12 || n[2] < 1 || n[2] > 31 || n[3] > 23 || n[4] > 59 || n[5] > 59) return 0;
  const at = new Date(n[0], n[1] - 1, n[2], n[3], n[4], n[5]).getTime();
  return Number.isFinite(at) ? at : 0;
}

/** store.TrashItem → AsideItem。stem / kind 由 store.identifiers.parse 给；不是文档（被删的图片等）→ stem = 最后一段、kind = null。 */
export function asideItemFrom(box: AsideKind, it: TrashItem, ids: Identifiers): AsideItem {
  const d = ids.parse(it.identifier);
  return {
    box,
    key: `${box}|${it.localKey ?? ""}|${it.cloudRef ?? ""}`,
    identifier: it.identifier,
    stem: d ? d.stem : it.identifier.slice(it.identifier.lastIndexOf("/") + 1),
    kind: d ? d.kind : null,
    at: asideTime(it.ts),
    side: it.side,
    localKey: it.localKey ?? null,
    cloudRef: it.cloudRef ?? null,
    encrypted: !!it.encrypted,
    conflictLive: !!it.conflictLive,   // 备份箱这一位 store 恒给 false（它不拿活文件名单去比）
  };
}

/** 新的在前；时间解析不出的沉底；同刻按名字。 */
export function sortAside(items: AsideItem[], compareName: (a: string, b: string) => number): AsideItem[] {
  return [...items].sort((a, b) => (b.at - a.at) || compareName(a.identifier, b.identifier) || a.key.localeCompare(b.key));
}
