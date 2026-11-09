// 图库时间线的顺序——明文规则，只此一处。created 2026-11-08 by Claude Fable 5.1
// user 2026-11-08：「文件夹肯定是要进排序的，不然文件夹都挡在上面，很烦很烦」「不带日期的常驻最上面，这个是我当时说带日期的文件夹堆在中间是同一回事」。
// 规则（作品和文件夹同一套，只看名字——作品看主干，文件夹看夹名；不看修改时间、不看种类）：
//   ① 名字开头正好是 8 位数字（yyyymmdd，后面不再紧跟数字）= 带日期。带日期的排成时间线：日期新的在上。
//   ② 其余的都算不带日期，常驻在所有带日期的上面（长跑的本子、没起日期名的夹）。
//   ③ 同一组里（同一天 / 都不带日期）按名字自然倒序（数字段按数值比：10 在 2 上面）。
//   ④ 名字完全一样：文件夹 → 作品 → 图片 → 认不出来的文件；再一样按身份自然倒序（只为顺序稳定）。
//   ⑤ 0.9.2：图片和认不出来的文件（杂物）也在这一条时间线里，看的是去掉最后一个扩展名的文件名——**日期比文件类型优先**
//      （user 2026-11-08：「同样一起并，因为我们这个 gallery 确实是应该是对文件名，就是我们应该是日期在排序里面比文件类型要优先，我们的字典排序」）。
//      0.9.1 及以前它们排在所有作品后面（图片按修改时间、杂物按名字）。
// 0.8.11 及以前，①② 是 Intl.Collator 倒序「顺带」出来的（数字排在字母、汉字前面），而且文件夹单独钉在最上面。
//   顺带出来的规则有两处和 ② 对不上：纯数字名字（「12」）和别的写法的日期（「2024-03-13」）按数值沉到最底。现在按 ② 它们在上面。
// 机械、不猜：不校验这 8 位是不是真的日期，不认别的日期写法，不读文件里的任何东西。
import { naturalCompare } from "./natural-order.ts";
import type { GItem } from "./gallery-view-model.ts";

/** 名字开头的 8 位日期（yyyymmdd）；不带 → null。「202411051234」这种 8 位后面还紧跟数字的不算。 */
export function leadingDate(name: string): string | null {
  const m = /^([0-9]{8})(?![0-9])/.exec(name);
  return m ? m[1]! : null;
}

/** 时间线上两个名字谁在上：负 = a 在上。 */
export function timelineCompare(a: string, b: string): number {
  const da = leadingDate(a), db = leadingDate(b);
  if (da == null && db != null) return -1;          // ② 不带日期的在上
  if (da != null && db == null) return 1;
  if (da != null && db != null && da !== db) return da < db ? 1 : -1;   // ① 日期新的在上（8 位定长，字符串比 = 数值比）
  return naturalCompare(b, a);                      // ③ 同组：名字自然倒序
}

/** 时间线上不是作品的文件（图片 / 认不出来的）：只要身份和给人看的名字（最后一段）。 */
export interface TimelineFile { identifier: string; label: string }
/** 时间线上的一格：文件夹（name = 相对当前夹的夹名）、作品、图片、认不出来的文件。 */
export type TimelineEntry = { type: "folder"; name: string } | { type: "doc"; item: GItem } | { type: "image"; file: TimelineFile } | { type: "other"; file: TimelineFile };

/** 不是作品的文件拿什么排：去掉最后一个扩展名的文件名（「20240101 草图.png」→「20240101 草图」；没有扩展名 / 点开头的原样）。 */
export const sortNameOfFile = (label: string): string => { const dot = label.lastIndexOf("."); return dot > 0 ? label.slice(0, dot) : label; };

/** 作品、文件夹、图片、认不出来的文件合成一列。 */
export function mergeTimeline(items: readonly GItem[], folderNames: readonly string[], images: readonly TimelineFile[] = [], others: readonly TimelineFile[] = []): TimelineEntry[] {
  const rows: { name: string; rank: 0 | 1 | 2 | 3; id: string; entry: TimelineEntry }[] = [
    ...folderNames.map((name) => ({ name, rank: 0 as const, id: name, entry: { type: "folder" as const, name } })),
    ...items.map((item) => ({ name: item.stem, rank: 1 as const, id: item.identifier, entry: { type: "doc" as const, item } })),
    ...images.map((file) => ({ name: sortNameOfFile(file.label), rank: 2 as const, id: file.identifier, entry: { type: "image" as const, file } })),
    ...others.map((file) => ({ name: sortNameOfFile(file.label), rank: 3 as const, id: file.identifier, entry: { type: "other" as const, file } })),
  ];
  rows.sort((a, b) => timelineCompare(a.name, b.name) || a.rank - b.rank || naturalCompare(b.id, a.id));   // ④
  return rows.map((r) => r.entry);
}
