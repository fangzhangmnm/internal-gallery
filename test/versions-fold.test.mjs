// 0.9.0：「存下来的一版」的名字规则（core/model/versions.ts）+ 收起的归组（core/model/fold-groups.ts）。created 2026-11-08 by Claude Fable 5.1
// user 2026-11-08：「点 backup 日期可以」「存一版都是自动折叠的」「收起…纯 UI 层面的事情…文件的归属还是应该是平铺的」「图库点开和我想的一样」。
import { describe, it, eq, assert } from "./runner.mjs";
import { createIdentifiers } from "@internal/store";
import { parseVersionStem, versionTargetName, versionsOf, dayStamp } from "../src/core/model/versions.ts";
import { foldTimeline, foldedCount, stripKey, versionsKey } from "../src/core/model/fold-groups.ts";
import { mergeTimeline } from "../src/core/model/timeline-order.ts";

const IDS = createIdentifiers([{ kind: "painting", suffix: ".ora", container: "zip" }, { kind: "draft", suffix: ".txt", container: "raw" }]);
const doc = (stem, extra = {}, suffix = ".ora") => ({ identifier: `${stem}${suffix}`, stem, kind: suffix === ".ora" ? "painting" : "draft", syncState: "synced", ...extra });
const show = (rows) => rows.map((r) => r.type === "folder" ? `[${r.name}]` : r.type === "strip" ? `<${r.count}${r.open ? "▾" : "▸"}>` : `${r.dim ? "·" : ""}${r.item.stem}${r.versions.length ? `+${r.versions.length}${r.versionsOpen ? "▾" : ""}` : ""}`).join(" | ");
const closed = { isOpen: () => false };

describe("versions · 名字规则", () => {
  it("认得的写法：<原主干>.backup-<8 位日期>，同一天第二份起带 -n", () => {
    eq(JSON.stringify(parseVersionStem("猫.backup-20261108")), JSON.stringify({ base: "猫", date: "20261108", n: 1 }));
    eq(JSON.stringify(parseVersionStem("20240301 猫.backup-20261108-3")), JSON.stringify({ base: "20240301 猫", date: "20261108", n: 3 }));
  });
  it("不认的：没有标记、日期位数不对、原主干是空的、别的写法", () => {
    for (const s of ["猫", "猫.backup", "猫.backup-2026", "猫 backup-20261108", ".backup-20261108", "猫.backup-20261108-", "猫.bak-20261108"]) eq(parseVersionStem(s), null, s);
  });
  it("起名：同夹、后缀不动；被占了往后数；最多只叠一层标记（给一版再存一版 = 按原主干起名）", () => {
    const taken = new Set(["夹/猫.backup-20261108.ora", "夹/猫.backup-20261108-2.ora"]);
    eq(versionTargetName("夹/猫.ora", "20261108", (n) => taken.has(n), IDS), "夹/猫.backup-20261108-3.ora");
    eq(versionTargetName("夹/猫.ora", "20261109", (n) => taken.has(n), IDS), "夹/猫.backup-20261109.ora");
    eq(versionTargetName("夹/猫.backup-20261108.ora", "20261110", () => false, IDS), "夹/猫.backup-20261110.ora", "不叠成 .backup-….backup-…");
  });
  it("dayStamp = 本机日期的 yyyymmdd", () => { eq(dayStamp(new Date(2026, 10, 8, 23, 59)), "20261108"); eq(dayStamp(new Date(2026, 0, 3)), "20260103"); });
  it("一份作品的各版：同种文档 ∧ 原主干一样；新的在前（日期，再序号）", () => {
    const o = doc("猫");
    const sib = [o, doc("猫.backup-20261101"), doc("猫.backup-20261108"), doc("猫.backup-20261108-2"), doc("猫咪.backup-20261108"), doc("猫.backup-20261108", {}, ".txt"), doc("狗")];
    eq(versionsOf(o, sib).map((x) => x.identifier).join(" | "), "猫.backup-20261108-2.ora | 猫.backup-20261108.ora | 猫.backup-20261101.ora");
  });
});

describe("fold-groups · 收起", () => {
  it("什么都没收起：一格一格照时间线画", () => {
    const tl = mergeTimeline([doc("20240101 a"), doc("日记")], ["20230101 夹"]);
    eq(show(foldTimeline(tl, closed)), "日记 | 20240101 a | [20230101 夹]");
    eq(foldedCount(tl), 0);
  });
  it("存下来的各版收在原作那一格底下：原作 +N，版本自己不占格", () => {
    const tl = mergeTimeline([doc("20240101 猫"), doc("20240101 猫.backup-20261101"), doc("20240101 猫.backup-20261108"), doc("20230101 狗")], []);
    eq(show(foldTimeline(tl, closed)), "20240101 猫+2 | 20230101 狗");
    eq(foldedCount(tl), 2);
  });
  it("点开 +N：各版在原作后面原地摊开（淡一档、新的在前），别的不动", () => {
    const tl = mergeTimeline([doc("20240101 猫"), doc("20240101 猫.backup-20261101"), doc("20240101 猫.backup-20261108"), doc("20230101 狗")], []);
    const rows = foldTimeline(tl, { isOpen: (k) => k === versionsKey("20240101 猫.ora") });
    eq(show(rows), "20240101 猫+2▾ | ·20240101 猫.backup-20261108 | ·20240101 猫.backup-20261101 | 20230101 狗");
    eq(rows[1].versionOf, "20240101 猫.ora");
  });
  it("手动收起的：时间线上挨着的合成一条细条，留在原来的位置；隔着没收起的就是两条", () => {
    const F = { folded: true };
    const tl = mergeTimeline([doc("20240105 e"), doc("20240104 d", F), doc("20240103 c", F), doc("20240102 b"), doc("20240101 a", F)], []);
    eq(show(foldTimeline(tl, closed)), "20240105 e | <2▸> | 20240102 b | <1▸>");
    eq(foldedCount(tl), 3);
  });
  it("文件夹也把细条隔开（收起的东西不跨过别的格子合并）", () => {
    const F = { folded: true };
    const tl = mergeTimeline([doc("20240103 c", F), doc("20240101 a", F)], ["20240102 夹"]);
    eq(show(foldTimeline(tl, closed)), "<1▸> | [20240102 夹] | <1▸>");
  });
  it("点开细条：原地摊开（淡一档），再点收回；摊开不等于取消收起", () => {
    const F = { folded: true };
    const items = [doc("20240105 e"), doc("20240104 d", F), doc("20240103 c", F), doc("20240102 b")];
    const tl = mergeTimeline(items, []);
    const key = stripKey("20240104 d.ora");
    eq(show(foldTimeline(tl, { isOpen: (k) => k === key })), "20240105 e | <2▾> | ·20240104 d | ·20240103 c | 20240102 b");
    assert(items[1].folded === true, "数据没被改");
  });
  it("原作不在的版本：自成一条（按名字天然算收起）", () => {
    const tl = mergeTimeline([doc("20240105 e"), doc("20240103 猫.backup-20261108"), doc("20240101 a")], []);
    eq(show(foldTimeline(tl, closed)), "20240105 e | <1▸> | 20240101 a");
  });
  it("收起的原作带着它的各版：摊开细条后原作照样有 +N", () => {
    const tl = mergeTimeline([doc("20240101 猫", { folded: true }), doc("20240101 猫.backup-20261108")], []);
    eq(show(foldTimeline(tl, closed)), "<1▸>");
    eq(show(foldTimeline(tl, { isOpen: () => true })), "<1▾> | ·20240101 猫+1▾ | ·20240101 猫.backup-20261108");
  });
  it("全部展开：每条细条、每个 +N 都摊开", () => {
    const tl = mergeTimeline([doc("20240103 c", { folded: true }), doc("20240101 猫"), doc("20240101 猫.backup-20261108")], []);
    eq(show(foldTimeline(tl, { isOpen: () => false, expandAll: true })), "<1▾> | ·20240103 c | 20240101 猫+1▾ | ·20240101 猫.backup-20261108");
  });
  it("一份不丢：全部展开时，每份作品正好出现一次", () => {
    const F = { folded: true };
    const items = [doc("a", F), doc("b"), doc("b.backup-20261108"), doc("c.backup-20261108"), doc("20240101 d", F), doc("20240101 d.backup-20261101"), doc("e", {}, ".txt"), doc("e.backup-20261108", {}, ".txt")];
    const rows = foldTimeline(mergeTimeline(items, ["夹"]), { isOpen: () => false, expandAll: true });
    const seen = rows.filter((r) => r.type === "doc").map((r) => r.item.identifier).sort();
    eq(seen.join("|"), items.map((i) => i.identifier).sort().join("|"));
  });
  it("0.9.2：图片 / 认不出来的文件也是一格，和文件夹一样把细条隔开；它们不能收起", () => {
    const F = { folded: true };
    const tl = mergeTimeline([doc("20240103 c", F), doc("20240101 a", F)], [], [{ identifier: "20240102 图.png", label: "20240102 图.png" }], [{ identifier: "笔记.md", label: "笔记.md" }]);
    const rows = foldTimeline(tl, closed);
    eq(rows.map((r) => r.type === "strip" ? `<${r.count}>` : r.type === "doc" ? r.item.stem : `${r.type}:${r.identifier}`).join(" | "), "other:笔记.md | <1> | image:20240102 图.png | <1>");
  });
  it("不同种文档不互相认版本（猫.txt 的版本不挂到 猫.ora 底下）", () => {
    const tl = mergeTimeline([doc("猫"), doc("猫.backup-20261108", {}, ".txt")], []);
    const rows = foldTimeline(tl, closed);
    eq(rows.find((r) => r.type === "doc").versions.length, 0);
    eq(rows.filter((r) => r.type === "strip").length, 1, "那份 txt 版本自成一条");
  });
});
