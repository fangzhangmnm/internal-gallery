// 收起：把时间线折成要画的行——纯显示，文件原地不动。created 2026-11-08 by Claude Fable 5.1
// user 2026-11-08：「收起我发现它的本质是什么？是防止你嫌烦，然后删，就是你可以收起而不是删」
//   「收起，我觉得它应该是一个纯 UI 层面的事情，就是它文件的归属还是应该是平铺的」「存一版都是自动折叠的」
//   「它的日期排序还是有语义的，就相当于有个东西你可以点开它展开」；展开方式 user 批了：「图库点开和我想的一样」。
// 规则：
//   ① 存下来的一版（名字 `<原主干>.backup-<日期>[-n]`，见 versions.ts）而且同夹里有原作 → 收在原作那一格底下：原作卡片角上「+N」，点开在它后面原地摊开。
//   ② 其余收起的（手动收起 = store 的 Item.folded；原作不在的版本）→ 时间线上挨着的合成一条细条「收起了 N 份」，就在它们原来的位置；点开原地摊开。
//   ③ 摊开只是看（屏幕上的临时状态，不落盘），不等于取消收起。摊开出来的卡片淡一档（dim）。
//   ④ 文件夹、没收起的作品照旧一格一格画，顺序 = 时间线的顺序（timeline-order.ts），收起的东西没有离开时间线。
// 它不是保密：细条露出「这里有东西」，点开就能看。不想给人看的用加密。
import type { GItem } from "./gallery-view-model.ts";
import type { TimelineEntry } from "./timeline-order.ts";
import { parseVersionStem, versionsOf } from "./versions.ts";

export type FoldRow =
  | { type: "folder"; name: string }
  /** 一格作品。versions = 收在它底下的各版（新的在前）；versionsOpen = 它们现在摊开着（紧跟在后面的几行就是）；dim = 这一格是摊开出来的（收起项 / 版本）。 */
  | { type: "doc"; item: GItem; versions: GItem[]; versionsOpen: boolean; dim: boolean; versionOf: string | null }
  /** 一条细条：这里收起了 count 份。open = 现在摊开着（紧跟在后面的 count 行就是）。key = 展开状态用的键。 */
  | { type: "strip"; key: string; count: number; open: boolean }
  /** 0.9.2：图片 / 认不出来的文件——不能收起，和文件夹一样把细条隔开。 */
  | { type: "image"; identifier: string }
  | { type: "other"; identifier: string };

/** 展开状态的键：细条 = "S:" + 这一串里第一份的身份；原作的各版 = "V:" + 原作的身份。 */
export const stripKey = (firstIdentifier: string): string => `S:${firstIdentifier}`;
export const versionsKey = (originalIdentifier: string): string => `V:${originalIdentifier}`;

export function foldTimeline(timeline: readonly TimelineEntry[], o: { isOpen: (key: string) => boolean; expandAll?: boolean }): FoldRow[] {
  const docs = timeline.filter((e): e is { type: "doc"; item: GItem } => e.type === "doc").map((e) => e.item);
  // ① 哪些是「有原作的版本」：按（种类, 原主干）找同夹里的原作。原作自己不能是另一份的版本名（避免链式挂靠）。
  const originals = new Map<string, GItem>();
  for (const it of docs) if (!parseVersionStem(it.stem)) originals.set(`${it.kind}\u0000${it.stem}`, it);
  const attached = new Set<string>();
  for (const it of docs) { const v = parseVersionStem(it.stem); if (v && originals.has(`${it.kind}\u0000${v.base}`)) attached.add(it.identifier); }
  const open = (key: string): boolean => o.expandAll === true || o.isOpen(key);
  const rows: FoldRow[] = [];
  const pushDoc = (item: GItem, dim: boolean): void => {
    const versions = parseVersionStem(item.stem) ? [] : versionsOf(item, docs);
    const versionsOpen = versions.length > 0 && open(versionsKey(item.identifier));
    rows.push({ type: "doc", item, versions, versionsOpen, dim, versionOf: null });
    if (versionsOpen) for (const v of versions) rows.push({ type: "doc", item: v, versions: [], versionsOpen: false, dim: true, versionOf: item.identifier });
  };
  let run: GItem[] = [];
  const flush = (): void => {
    if (!run.length) return;
    const key = stripKey(run[0]!.identifier), isOpen = open(key);
    rows.push({ type: "strip", key, count: run.length, open: isOpen });
    if (isOpen) for (const it of run) pushDoc(it, true);
    run = [];
  };
  for (const e of timeline) {
    if (e.type === "folder") { flush(); rows.push({ type: "folder", name: e.name }); continue; }
    if (e.type === "image" || e.type === "other") { flush(); rows.push({ type: e.type, identifier: e.file.identifier }); continue; }
    const it = e.item;
    if (attached.has(it.identifier)) continue;                       // ① 跟着原作走
    if (it.folded || parseVersionStem(it.stem)) { run.push(it); continue; }   // ② 手动收起的 / 原作不在的版本
    flush(); pushDoc(it, false);
  }
  flush();
  return rows;
}

/** 这一夹里一共收起了几份（细条里的 + 收在原作底下的各版）。顶上「全部展开」那一条用。 */
export function foldedCount(timeline: readonly TimelineEntry[]): number {
  let n = 0;
  for (const e of timeline) if (e.type === "doc" && (e.item.folded || parseVersionStem(e.item.stem))) n++;
  return n;
}
