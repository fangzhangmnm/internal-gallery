// Gallery 展示派生（UI 深化 candidate 1 · gallery）。
//
// 纯函数：把 store.list() 解析出的 item（{name, local|null, cloud|null, dirty}）+ 运行态
// （signedIn / 当前活动名）→ 组件渲染需要的「显示什么」。零 DOM / 零网络 / 零 store。
// 数据解析（本地⊕云 merge / dirty）在 store（app-store.listGallery）；文件夹切片 / 路径代数
// 在 gallery-model.js + gallery-path.js（已测）；这里只补**展示层派生**：徽章 4 态、面包屑、tile 字段。
//
// 复用形状：item 形状通用、徽章/面包屑无 ORA 依赖 → 整块可抬给 AtlasMaker/RealHome（WeebPaint 专用 example）。

import { isCached, isDirty, type SyncState } from "@internal/store";
import { t } from "../text.ts";
import type { AsideItem } from "./aside.ts";

// （0.5.0：回收站专用的 LocalSessionMeta / CloudFileMeta / TrashGItem / TrashTile / trashTileFor 退役——
//   它们是 WeebPaint 本地 session 时代的形状（thumb / updatedAt / size 这些字段数据面从来没填过），
//   回收站和备份箱现在共用 core/model/aside.ts 的 AsideItem。）

/** 0.4.0（user 2026-09-19「gallery 该直接吃 syncState」）：图库消费的文件项 = store Item 切开之后的视图。
 *  **唯一状态源 = syncState（store 9 态）**；徽章 / 菜单 / 缩略图来源全从它算，本包不再派生 local/cloud/dirty/ghost… 一堆布尔
 *  （那正是 store Item 注释警告的「下游重推导越狱」形状）。size / lastModified 是数据不是状态。
 *  0.6.0：identifier = 身份（原 name，裸名时代的产物退役）；stem / kind 来自 store.identifiers.parse——图库里只有文档（parse 得出的）才是 GItem。 */
export interface GItem { identifier: string; stem: string; kind: string; syncState: SyncState; size?: number; lastModified?: number }

// 读状态的三个谓词——全包唯一允许「看 syncState 分支」的地方（模板 / verbs 只准用它们，不准再写 `s === "…"`）。
/** 本地有字节副本（store isCached：synced / unpushed / newer-on-cloud / conflict / ghost / pendingGone / float / local-only）。 */
export const hasLocalCopy = (s: SyncState): boolean => isCached(s);
/** 云端有副本（cloud-only / synced / unpushed / newer-on-cloud / conflict）。 */
export const hasCloudCopy = (s: SyncState): boolean => s === "cloud-only" || s === "synced" || s === "unpushed" || s === "newer-on-cloud" || s === "conflict";
/** 有未推字节（store isDirty）。 */
export const hasUnpushed = (s: SyncState): boolean => isDirty(s);
/** 云端字节比本地新 → 缩略图必须走 source:"cloud"（QA 2026-08-21「新 token 配旧字节」根修）。 */
export const cloudBytesNewer = (s: SyncState): boolean => s === "newer-on-cloud" || s === "conflict";

// 文件 tile 的同步徽章（图标 SVG 在组件 template 里按 kind 渲）。ghost = cloud-gone dirty 孤儿；pendingGone = cloud-gone clean（grace 内）。
export type BadgeKind = "syncedBoth" | "dirtyBoth" | "cloudOnly" | "localOnly" | "float" | "ghost" | "pendingGone" | "newerOnCloud" | "conflictBoth";   // 9 值 = store SyncState 一一对应（2026-09-09 补 float：从未同步 ∧ 有编辑）

export interface GalleryTile {
  identifier: string;    // 身份（key / 移动改名用；tooltip）
  stem: string;          // 主干 = 卡片上显示的名字
  kind: string;          // 文档种类（宿主的标签；缩略图策略按它）
  time: number;          // ms epoch
  size: number;          // bytes
  syncState: SyncState;  // 0.4.0：原样带着（宿主 hook / 调试）
  badge: BadgeKind;
  badgeTitle: string;
  hasLocal: boolean;     // 0.4.0：模板用的三个谓词（hasLocalCopy / hasCloudCopy / cloudBytesNewer 的结果）
  hasCloud: boolean;
  cloudNewer: boolean;
  ghost: boolean;        // cloud-gone dirty 孤儿（云端 path 被别的设备改名/删，本地有未推编辑）→ UI surface
  pendingGone: boolean;  // cloud-gone clean 孤儿、防抖 grace 内（照常显示 + badge；宽限后自动移入回收站；可「重新上传」/「删除」）
  isActive: boolean;
  encrypted: boolean;    // 本地字节是加密容器（ADR-0012），由 gallery 按夹探测注入。纯云端项未知（thumb 拉回时按 MIME 现场识别）
}

/** store 9 态 → 徽章 9 态，一一对应、零推导。登出视角 / 离线的压扁由 store 在算 syncState 时做（ListContext），本包不再重做。 */
const BADGE_OF: Record<SyncState, BadgeKind> = {
  "cloud-only": "cloudOnly", synced: "syncedBoth", unpushed: "dirtyBoth", "newer-on-cloud": "newerOnCloud", conflict: "conflictBoth",
  ghost: "ghost", pendingGone: "pendingGone", float: "float", "local-only": "localOnly",
};
export function tileFor(
  item: GItem,
  opts: { signedIn: boolean; activeIdentifier: string | null; encrypted?: boolean },
): GalleryTile {
  const s = item.syncState;
  const badge = BADGE_OF[s] ?? "localOnly";
  const badgeTitle = badge === "localOnly" && !opts.signedIn ? t("gv.badge.localPlain") : t(`gv.badge.${badge}` as Parameters<typeof t>[0]);
  return {
    identifier: item.identifier,
    stem: item.stem,
    kind: item.kind,
    time: item.lastModified ?? 0,
    size: item.size ?? 0,
    syncState: s,
    badge, badgeTitle,
    hasLocal: hasLocalCopy(s), hasCloud: hasCloudCopy(s), cloudNewer: cloudBytesNewer(s),
    ghost: s === "ghost",
    pendingGone: s === "pendingGone",
    isActive: !!opts.activeIdentifier && item.identifier === opts.activeIdentifier,
    // 加密态由调用方探测后注入（store 的 Item 内容盲、没有 encrypted 轴）。
    encrypted: !!opts.encrypted,
  };
}

// 面包屑：根 + 每段（current=最后一段 / 根无文件夹时）。
export interface Crumb { label: string; path: string; current: boolean; }

export function breadcrumb(folder: string): Crumb[] {
  const out: Crumb[] = [{ label: t("gv.rootDir"), path: "", current: !folder }];
  if (folder) {
    const segs = folder.split("/").filter(Boolean);
    let accum = "";
    segs.forEach((seg, i) => {
      accum = accum ? `${accum}/${seg}` : seg;
      out.push({ label: seg, path: accum, current: i === segs.length - 1 });
    });
  }
  return out;
}

// 搁置区 tile（回收站 / 备份箱）：在哪一端 + 什么时候挪到一边的。
export interface AsideTile {
  key: string;
  identifier: string;
  stem: string;          // 文档 = 主干；非文档 = 最后一段
  at: number;
  source: string;        // 本地 / 云端 / 本地+云端（回收站另有「云端仍在」）
}

// 展示格式化（纯）。humanTime 读 now：组件用，测试只覆 humanSize。
export function humanTime(ts: number): string {
  if (!ts) return t("gv.time.unknown");
  const d = new Date(ts);
  const dt = Date.now() - ts;
  if (dt < 60 * 1000) return t("gv.time.justNow");
  if (dt < 60 * 60 * 1000) return t("gv.time.minAgo", { n: Math.floor(dt / 60000) });
  if (dt < 24 * 60 * 60 * 1000) return t("gv.time.hourAgo", { n: Math.floor(dt / 3600000) });
  if (dt < 7 * 24 * 60 * 60 * 1000) return t("gv.time.dayAgo", { n: Math.floor(dt / 86400000) });
  return d.toLocaleDateString();
}
// 家规：数据层裸字节、显示层二进制单位（KiB/MiB，1024 进制）——见 timelapse-state.ts 注释。
//   旧版 1024 进制却标 KB/MB（十进制单位名）是违约方，2026-08-21 改标 KiB/MiB/GiB。
export function humanSize(b: number | null | undefined): string {
  if (b == null) return "?";
  if (b === 0) return "0 B";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KiB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1048576).toFixed(1)} MiB`;
  return `${(b / 1073741824).toFixed(2)} GiB`;
}

export function asideTileFor(item: AsideItem): AsideTile {
  const base = item.side === "both" ? t("gv.src.both") : item.side === "local" ? t("gv.src.local") : t("gv.src.cloud");
  const source = item.conflictLive ? t("gv.src.cloudStillAlive", { base }) : base;   // 离线删被撤销：本地回收站有、云端还活着 → 提示两存
  return { key: item.key, identifier: item.identifier, stem: item.stem, at: item.at, source };
}
/** 完整钟点（卡片副行的 tooltip：同一份稿一小时内留了两版底，「1 小时前」分不出来）。 */
export function fullTime(ts: number): string {
  return ts ? new Date(ts).toLocaleString() : t("gv.time.unknown");
}
