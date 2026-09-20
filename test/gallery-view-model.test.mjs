// Gallery 展示派生测试（UI 深化 candidate 1 · gallery）。
import { describe, it, eq, assert } from "./runner.mjs";
import { tileFor, breadcrumb, trashTileFor, humanSize } from "../src/core/model/gallery-view-model.ts";
import { naturalCompare } from "../src/core/model/natural-order.ts";

describe("gallery-view-model · tileFor = store 9 态直映（0.4.0：不再派生 local/cloud/dirty 布尔）", () => {
  const on = { signedIn: true, activeName: null };
  const badges = { "cloud-only": "cloudOnly", synced: "syncedBoth", unpushed: "dirtyBoth", "newer-on-cloud": "newerOnCloud", conflict: "conflictBoth", ghost: "ghost", pendingGone: "pendingGone", float: "float", "local-only": "localOnly" };
  it("9 态一一对应，零推导", () => {
    for (const [s, b] of Object.entries(badges)) eq(tileFor({ name: "a", syncState: s }, on).badge, b, s);
  });
  it("三谓词跟着 syncState：hasLocal / hasCloud / cloudNewer；ghost / pendingGone 旗", () => {
    const t1 = tileFor({ name: "a", syncState: "synced" }, on); assert(t1.hasLocal && t1.hasCloud && !t1.cloudNewer);
    const t2 = tileFor({ name: "a", syncState: "cloud-only" }, on); assert(!t2.hasLocal && t2.hasCloud);
    const t3 = tileFor({ name: "a", syncState: "float" }, on); assert(t3.hasLocal && !t3.hasCloud);
    const t4 = tileFor({ name: "a", syncState: "newer-on-cloud" }, on); assert(t4.cloudNewer);
    const t5 = tileFor({ name: "a", syncState: "conflict" }, on); assert(t5.cloudNewer && t5.hasLocal && t5.hasCloud);
    eq(tileFor({ name: "a", syncState: "ghost" }, on).ghost, true); eq(tileFor({ name: "a", syncState: "pendingGone" }, on).pendingGone, true);
    eq(tileFor({ name: "a", syncState: "local-only" }, on).ghost, false);
    assert(/moved or deleted/.test(tileFor({ name: "a", syncState: "ghost" }, on).badgeTitle), "ghost 标题说明 cloud-gone");
    assert(/unsynced|never uploaded/i.test(tileFor({ name: "a", syncState: "float" }, on).badgeTitle));
  });
  it("登出视角不在本包压扁（store 算 syncState 时已按 ListContext 处理）；只有 localOnly 的文案换成「本地」", () => {
    eq(tileFor({ name: "a", syncState: "unpushed" }, { signedIn: false, activeName: null }).badge, "dirtyBoth");
    const off = tileFor({ name: "a", syncState: "local-only" }, { signedIn: false, activeName: null });
    eq(off.badge, "localOnly"); assert(off.badgeTitle !== tileFor({ name: "a", syncState: "local-only" }, on).badgeTitle, "登出文案不同");
  });
  it("displayName = basename，time/size 取 item 的 lastModified/size；isActive 配对当前活动名", () => {
    const t = tileFor({ name: "f/sub/pic", syncState: "local-only", size: 10, lastModified: 100 }, on);
    eq(t.displayName, "pic"); eq(t.fullPath, "f/sub/pic"); eq(t.time, 100); eq(t.size, 10); eq(t.syncState, "local-only");
    eq(tileFor({ name: "a", syncState: "synced" }, { signedIn: true, activeName: "a" }).isActive, true);
    eq(tileFor({ name: "a", syncState: "synced" }, { signedIn: true, activeName: "b" }).isActive, false);
  });
});

describe("gallery-view-model · breadcrumb", () => {
  it("根 = 仅根段·current", () => {
    const b = breadcrumb("");
    eq(b.length, 1);
    eq(b[0].path, "");
    assert(b[0].current);
  });
  it("嵌套累积路径，末段 current", () => {
    const b = breadcrumb("characters/side");
    eq(b.length, 3);
    eq(b[0].path, ""); eq(b[1].path, "characters"); eq(b[2].path, "characters/side");
    assert(!b[0].current); assert(!b[1].current); assert(b[2].current);
  });
});

describe("gallery-view-model · trashTileFor", () => {
  it("来源标签", () => {
    eq(trashTileFor({ name: "a", local: {}, cloud: {} }).source, "Local+cloud");
    eq(trashTileFor({ name: "a", local: {}, cloud: null }).source, "Local");
    eq(trashTileFor({ name: "a", local: null, cloud: {} }).source, "Cloud");
  });
  // （旧 mergeTrash 锚已随函数被 store 库收编 → 真测试在 test/trash-merge.test.ts）
});

describe("gallery-view-model · humanSize（家规：1024 进制标二进制单位 KiB/MiB）", () => {
  it("null/0/字节档", () => {
    eq(humanSize(null), "?");
    eq(humanSize(undefined), "?");
    eq(humanSize(0), "0 B");
    eq(humanSize(1023), "1023 B");
  });
  it("KiB/MiB/GiB 档（1024 进制，单位名必须带 i）", () => {
    eq(humanSize(1024), "1 KiB");
    eq(humanSize(953 * 1024), "953 KiB");          // ≈0.93 MB 十进制——标 KB 就撒谎了
    eq(humanSize(1024 * 1024), "1.0 MiB");
    eq(humanSize(1.5 * 1024 * 1024 * 1024), "1.50 GiB");
  });
});

// 图库自然排序（user 2026-08-21：「图库排序是自然排序吧（10 在 2 后面）」）——共享 collator 的行为锁。
// 消费点：app-store.watchFolder（docs 倒序 / images 退路倒序 / folderNames 正排）+ gallery.move 目标夹列表。
describe("gallery · naturalCompare 自然排序", () => {
  it("数字段按数值比：a2 < a10（旧字典序会把 10 排 2 前面）", () => {
    assert(naturalCompare("a2", "a10") < 0, "a2 < a10");
    assert(naturalCompare("a10", "a2") > 0, "a10 > a2");
    eq(["a10", "a1", "a2"].sort(naturalCompare).join(","), "a1,a2,a10");
    eq(["画作10", "画作2", "画作1"].sort(naturalCompare).join(","), "画作1,画作2,画作10", "中文前缀+数字");
  });
  it("倒序消费形状（watchFolder items：naturalCompare(b,a)）", () => {
    eq(["20260101-a", "20260110-b", "20260102-c"].sort((a, b) => naturalCompare(b, a)).join(","),
      "20260110-b,20260102-c,20260101-a", "新日期在前");
  });
  it("中文/大小写不炸且自洽", () => {
    eq(naturalCompare("月白", "月白"), 0, "同名相等");
    eq(naturalCompare("ABC", "abc"), 0, "sensitivity base：大小写同序");
    const arr = ["樱花", "月白", "abc", "ABC2", "abc10"].sort(naturalCompare);
    eq(arr.length, 5, "排序不炸不丢");
    assert(arr.indexOf("ABC2") < arr.indexOf("abc10"), "跨大小写数字段仍数值比");
  });
});
