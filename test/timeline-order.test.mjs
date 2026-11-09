// 0.8.12：时间线的顺序（明文规则，core/model/timeline-order.ts）。created 2026-11-08 by Claude Fable 5.1
// user 2026-11-08：「文件夹肯定是要进排序的，不然文件夹都挡在上面，很烦很烦」「不带日期的常驻最上面，这个是我当时说带日期的文件夹堆在中间是同一回事」。
import { describe, it, eq, assert } from "./runner.mjs";
import { leadingDate, timelineCompare, mergeTimeline } from "../src/core/model/timeline-order.ts";

const doc = (stem, identifier = `${stem}.ora`) => ({ identifier, stem, kind: "painting", syncState: "synced" });
const order = (names) => [...names].sort(timelineCompare).join(" | ");
const shuffled = (arr, seed) => { const a = [...arr]; let s = seed; for (let i = a.length - 1; i > 0; i--) { s = (s * 1103515245 + 12345) & 0x7fffffff; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

describe("timeline-order · 哪些名字算带日期", () => {
  it("开头正好 8 位数字 = 带日期；后面跟空格 / 横杠 / 下划线 / 汉字 / 什么都不跟都算", () => {
    eq(leadingDate("20241105 猫"), "20241105"); eq(leadingDate("20241105-a3f2"), "20241105"); eq(leadingDate("20241105_猫"), "20241105");
    eq(leadingDate("20241105猫"), "20241105"); eq(leadingDate("20241105"), "20241105");
  });
  it("别的都不算：没有数字开头、位数不对、8 位后面还紧跟数字、别的日期写法", () => {
    for (const n of ["日记", "Sprite-0001", "12", "0001", "2024-03-13 猫", "202411051234", "2024110", "猫 20241105", ""]) eq(leadingDate(n), null, n);
  });
});

describe("timeline-order · 规则", () => {
  it("带日期的排成时间线，新的在上；分隔符是空格 / 横杠 / 下划线都一样按日期排", () => {
    eq(order(["20230101 a", "20241105-b", "20240301_c", "20251231 d", "20240301 e"]), "20251231 d | 20241105-b | 20240301_c | 20240301 e | 20230101 a");
  });
  it("不带日期的常驻在所有带日期的上面（长跑的本子）", () => {
    const got = [...["20260101 新", "日记", "20230101 旧", "笑话本", "Sprite-0001"]].sort(timelineCompare);
    eq(got.slice(3).join(" | "), "20260101 新 | 20230101 旧", "带日期的在最下面两格，按日期");
    assert(["日记", "笑话本", "Sprite-0001"].every((n) => got.indexOf(n) < 3), "不带日期的三个都在上面");
  });
  it("纯数字名字、别的写法的日期也算不带日期 → 在上面（0.8.11 及以前它们按数值沉到最底）", () => {
    const got = [...["20240101 画", "12", "2024-03-13 猫", "0001"]].sort(timelineCompare);
    eq(got[3], "20240101 画");
  });
  it("同一天里按名字自然倒序：数字段按数值比（10 在 2 上面）", () => {
    eq(order(["20241105 练习2", "20241105 练习10", "20241105 练习1"]), "20241105 练习10 | 20241105 练习2 | 20241105 练习1");
  });
  it("不带日期的一组里也是名字自然倒序（和 0.8.11 的作品顺序一样）", () => {
    eq(order(["2", "10", "1"]), "10 | 2 | 1");
  });
  it("输入顺序不影响结果（比较是全序：打乱二十次都一样）", () => {
    const names = ["日记", "笑话本", "Sprite-0001", "Sprite-0002", "12", "2024-03-13 猫", "20230101 a", "20241105-b", "20241105 c", "20241105_d", "20251231", "20240229 闰", "夹", "a", "B"];
    const want = order(names);
    for (let seed = 1; seed <= 20; seed++) eq(order(shuffled(names, seed)), want, `seed ${seed}`);
  });
});

describe("timeline-order · 文件夹进排序", () => {
  it("带日期的文件夹落在时间线中间，不再钉在最上面", () => {
    const tl = mergeTimeline([doc("20241201 画"), doc("20240101 画"), doc("20231201 画")], ["20240601 旅行", "20230101 旧夹"]);
    eq(tl.map((e) => e.type === "folder" ? `[${e.name}]` : e.item.stem).join(" | "), "20241201 画 | [20240601 旅行] | 20240101 画 | 20231201 画 | [20230101 旧夹]");
  });
  it("不带日期的文件夹和不带日期的作品一起常驻最上面", () => {
    const tl = mergeTimeline([doc("20241201 画"), doc("日记")], ["素材", "20240601 旅行"]);
    const names = tl.map((e) => e.type === "folder" ? `[${e.name}]` : e.item.stem);
    eq(names.slice(2).join(" | "), "20241201 画 | [20240601 旅行]");
    assert(names.indexOf("[素材]") < 2 && names.indexOf("日记") < 2);
  });
  it("名字完全一样：文件夹在作品上面；同主干不同种类按身份排，顺序稳定", () => {
    const tl = mergeTimeline([doc("20240101 猫", "20240101 猫.ora"), doc("20240101 猫", "20240101 猫.txt")], ["20240101 猫"]);
    eq(tl.map((e) => e.type === "folder" ? `[${e.name}]` : e.item.identifier).join(" | "), "[20240101 猫] | 20240101 猫.txt | 20240101 猫.ora");
  });
  it("一份不多、一份不少", () => {
    const docs = ["a", "20240101", "b", "20250101 x"].map((s) => doc(s)), folders = ["夹1", "20240601", "夹2"];
    const tl = mergeTimeline(docs, folders);
    eq(tl.length, 7);
    eq(tl.filter((e) => e.type === "doc").map((e) => e.item.identifier).sort().join("|"), docs.map((d) => d.identifier).sort().join("|"));
    eq(tl.filter((e) => e.type === "folder").map((e) => e.name).sort().join("|"), [...folders].sort().join("|"));
  });
});
