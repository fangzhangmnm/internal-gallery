// 「存下来的一版」的名字规则——只此一处。created 2026-11-08 by Claude Fable 5.1
// user 2026-11-08：「手动存…你这个的语义就是复制一份」「我一般会用什么点 backup 之类的，就是让人一看就知道是不是正主」「点 backup 日期可以」。
//   正主永远是不带标记的那个名字；存下来的那份 = `<原主干>.backup-<yyyymmdd>`，同一天再存一份 = `…-2`、`…-3`。名字里的日期永远是存的那天。
//   版本和原作在同一个文件夹、同一种文档（后缀一样）。关联只看**现在的名字**：原作改了名，旧版本不跟着改，会自成一条（已知，设计稿第十三节）。
//   库（store）零命名知识；这条规则归图库。
import type { Identifiers } from "@internal/store";
import { withStemTail } from "@internal/store";
import type { GItem } from "./gallery-view-model.ts";

export const VERSION_MARK = ".backup-";

/** 主干是不是「存下来的一版」的写法：`<原主干>.backup-<yyyymmdd>[-n]`（n ≥ 2）。是 → 拆开；不是 → null。 */
export function parseVersionStem(stem: string): { base: string; date: string; n: number } | null {
  const m = /^(.+)\.backup-([0-9]{8})(?:-([0-9]{1,4}))?$/.exec(stem);
  if (!m) return null;
  return { base: m[1]!, date: m[2]!, n: m[3] ? Number(m[3]) : 1 };
}

/** 今天的 yyyymmdd（本机日期；now 可注入）。 */
export function dayStamp(now: Date = new Date()): string {
  const p2 = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${p2(now.getMonth() + 1)}${p2(now.getDate())}`;
}

/** 这一版该叫什么：同文件夹下 `<主干>.backup-<day>`，被占了就 `-2`、`-3`…（taken = 当前夹里已有的身份；最后一道防线是 store 的 mode:"new" 不覆盖同名）。
 *  source 自己就是一版（主干已经带标记）→ 按它的原主干起名，不叠标记。 */
export function versionTargetName(source: string, day: string, taken: (identifier: string) => boolean, ids: Identifiers): string {
  const d = ids.parse(source);
  const v = d ? parseVersionStem(d.stem) : null;
  const origin = d && v ? ids.join({ folder: d.folder, stem: v.base, suffix: d.suffix }) : source;
  for (let n = 1; n < 10000; n++) {
    const candidate = withStemTail(origin, `${VERSION_MARK}${day}${n === 1 ? "" : `-${n}`}`, ids);
    if (!taken(candidate)) return candidate;
  }
  throw new Error(`versionTargetName: no free version name for "${source}" on ${day}`);
}

/** 同一夹里这份作品存下来的各版，新的在前（日期新的在前，同一天序号大的在前）。同种文档、原主干一样才算。 */
export function versionsOf(original: GItem, siblings: readonly GItem[]): GItem[] {
  const out: { item: GItem; date: string; n: number }[] = [];
  for (const it of siblings) {
    if (it.kind !== original.kind || it.identifier === original.identifier) continue;
    const v = parseVersionStem(it.stem);
    if (v && v.base === original.stem) out.push({ item: it, date: v.date, n: v.n });
  }
  out.sort((a, b) => (a.date === b.date ? b.n - a.n : a.date < b.date ? 1 : -1));
  return out.map((x) => x.item);
}
