// Gallery 文件夹模型（A2 出生；C3 瘦身后 = 纯展示助手）。
// 纯数据（无 DOM / 无网络 / 无 store）。
// 旧的 mergeLocalCloud/sliceFolder/mergeTrash/classifyCloudGone/folderHasContents 已被 store 库
// 收编（listing.ts / watchFolder 切片 / trash-merge.ts / reconcile.ts——网盘模型 2026-07-11 拍板），
// 本模块只剩 gallery UI 自己的展示纯函数与列表项类型。

// 本模块只读这些字段；local session / cloud file 本体仍是未类型化 .js。
import { t } from "../text.ts";

// （0.6.0：NameBoundary（bare / full / display）退役——裸名当身份是「一个 app 一种扩展名」时代的产物；身份永远是全名，
//   主干只给人看。切身份、拼身份全走 store.identifiers（提案 store 仓 ai-docs/20260929-proposal-doc-types.md）。）
import { withStemTail, type Identifiers } from "@internal/store";

export interface LocalSession { name: string; updatedAt?: number; }
export interface CloudFile { path: string; name?: string; lastModifiedDateTime?: string; }
export interface GalleryItem { name: string; local: LocalSession | null; cloud: CloudFile | null; deletedAt?: number; }

// item 的展示时间（本地 updatedAt 优先，否则云端 lastModifiedDateTime）。
export function itemTime(it: GalleryItem): number {
  return (it.local?.updatedAt) || Date.parse(String(it.cloud?.lastModifiedDateTime || 0));
}

// 复制的目标身份（纯）：同文件夹下「<主干> 副本」/「<主干> 副本2」…首个不撞的，后缀不动（withStemTail：文档插在后缀前、非文档插在最后一个点前）。
//   taken(identifier) = 是否已被占用（本地⊕云端的并集，调用方传入；同步谓词，无网络）。
//   0.5.x 及以前在身份末尾接「副本」，名字带后缀的宿主复制出来是 `书.webxiaoheiwu.zip 副本`（认不出的杂物）——提案 §3 第 12 行。
export function copyTargetName(source: string, taken: (identifier: string) => boolean, ids: Identifiers): string {
  const SUF = t("name.copySuffix");
  let candidate = withStemTail(source, ` ${SUF}`, ids);
  if (!taken(candidate)) return candidate;
  for (let i = 2; i < 1000; i++) {
    candidate = withStemTail(source, ` ${SUF}${i}`, ids);
    if (!taken(candidate)) return candidate;
  }
  return withStemTail(source, ` ${SUF}${Date.now()}`, ids);
}

// 新身份的唯一版本（v0.10.4 从 gallery-shell 提出成纯函数供 pin；0.6.0 改收身份，原 uniqueBareName）。
//   「不静默覆盖旧画」链的第 2 层兜底：第 1 层 = 调用方预检（如 openImageTile 的孪生占用门），
//   第 3 层 = store 首存 mode:"new" 护栏（占用抛 CloudNameCollisionError，绝不覆盖）。
//   未占用即用；占用 → 主干后接 " 1"…" 19"（后缀不动）；全占 → 时间戳兜底。occupied = store.files.occupied（异步，在线含云端一跳）。
export async function uniqueIdentifier(identifier: string, occupied: (identifier: string) => Promise<unknown>, ids: Identifiers): Promise<string> {
  if (!(await occupied(identifier))) return identifier;
  for (let i = 1; i < 20; i++) {
    const candidate = withStemTail(identifier, ` ${i}`, ids);
    if (!(await occupied(candidate))) return candidate;
  }
  return withStemTail(identifier, ` ${Date.now()}`, ids);
}
