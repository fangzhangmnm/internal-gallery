// 搁置区（回收站 / 备份箱）模型 + 数据面。created 2026-09-29 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { ASIDE, asideTime, asideItemFrom, sortAside } from "../src/core/model/aside.ts";
import { createGalleryDataFace } from "../src/core/data-face.ts";
import { GALLERY_TEXT } from "../src/core/text.ts";
import { naturalCompare } from "../src/core/model/natural-order.ts";

const raw = (name, ts, extra = {}) => ({ name, ts, side: "local", encrypted: false, conflictLive: false, localKey: `backup/${ts}-aaaa:${name}`, cloudRef: null, ...extra });

describe("aside · asideTime（store 的 yyyymmddhhmmss 戳 → ms）", () => {
  it("合法戳按本机时区读", () => {
    eq(asideTime("20260929143205"), new Date(2026, 8, 29, 14, 32, 5).getTime());
  });
  it("解析不出 / 越界 → 0（界面显示未知时间，不瞎编）", () => {
    for (const bad of [null, undefined, "", "2026", "2026092914320", "20261329143205", "20260932143205", "20260929243205", "20260929146005", "abcdefghijklmn"]) eq(asideTime(bad), 0, String(bad));
  });
});

describe("aside · asideItemFrom / sortAside", () => {
  it("同名的两条留底 key 不同（列表渲染和菜单开合靠它，撞了就串）", () => {
    const a = asideItemFrom("backup", raw("稿.txt", "20260929100000"), (s) => s);
    const b = asideItemFrom("backup", raw("稿.txt", "20260929110000"), (s) => s);
    assert(a.key !== b.key, `${a.key} vs ${b.key}`);
    eq(a.name, b.name);
  });
  it("同一条记录在回收站和备份箱里 key 也不同；kind 写在 item 上", () => {
    const r = raw("稿.txt", "20260929100000");
    const a = asideItemFrom("trash", r, (s) => s), b = asideItemFrom("backup", r, (s) => s);
    eq(a.kind, "trash"); eq(b.kind, "backup"); assert(a.key !== b.key);
  });
  it("裸名边界、两把钥匙、加密旗原样带出", () => {
    const it2 = asideItemFrom("backup", raw("夹/猫.ora", "20260929100000", { side: "both", cloudRef: "C1", encrypted: true }), (s) => s.replace(/\.ora$/, ""));
    eq(it2.name, "夹/猫"); eq(it2.localKey, "backup/20260929100000-aaaa:夹/猫.ora"); eq(it2.cloudRef, "C1"); eq(it2.encrypted, true); eq(it2.side, "both");
  });
  it("排序：新的在前；没有时间的沉底；同刻按名字自然序", () => {
    const rows = [raw("b", null), raw("a10", "20260101000000"), raw("a2", "20260101000000"), raw("z", "20260929000000")].map((r) => asideItemFrom("backup", r, (s) => s));
    eq(sortAside(rows, naturalCompare).map((r) => r.name).join("|"), "z|a2|a10|b");
  });
});

describe("aside · 差异表 ASIDE", () => {
  it("两个分区各读各的列表、各清各的", async () => {
    const calls = [];
    const files = { listTrash: async () => { calls.push("listTrash"); return []; }, listBackup: async () => { calls.push("listBackup"); return []; },
      emptyTrash: async (o) => { calls.push(`emptyTrash:${o.scope}`); return {}; }, emptyBackup: async (o) => { calls.push(`emptyBackup:${o.scope}`); return {}; } };
    await ASIDE.trash.list(files); await ASIDE.backup.list(files); await ASIDE.trash.empty(files, "local"); await ASIDE.backup.empty(files, "cloud");
    eq(calls.join(","), "listTrash,listBackup,emptyTrash:local,emptyBackup:cloud");
  });
  it("表是冻结的：运行时改不动", () => {
    assert(Object.isFrozen(ASIDE) && Object.isFrozen(ASIDE.backup) && Object.isFrozen(ASIDE.backup.text), "frozen");
    let threw = false;
    try { ASIDE.backup.list = async () => []; } catch { threw = true; }
    assert(threw, "严格模式下写冻结对象必须抛");
  });
  it("表里每个文案 key 都真的在文案表里，而且三语都有", () => {
    for (const kind of ["trash", "backup"]) for (const [slot, key] of Object.entries(ASIDE[kind].text)) {
      const e = GALLERY_TEXT[key];
      assert(e, `${kind}.${slot} → ${key} 不在文案表`);
      assert(e.zh && e.en && e.ja, `${key} 缺语言`);
    }
  });
  it("备份箱不按名字取缩略图（按名字取到的是现在那一版的图）；回收站照旧", () => {
    eq(ASIDE.backup.thumb, "none"); eq(ASIDE.trash.thumb, "by-name");
  });
});

describe("data-face · listAside（列表只来自 store）", () => {
  const store = { files: { watchFolder: () => () => {},
    listTrash: async () => [raw("删掉的.ora", "20260901080000", { localKey: "trash/20260901080000-bbbb:删掉的.ora" })],
    listBackup: async () => [raw("稿.ora", "20260929100000"), raw("稿.ora", "20260929113000"), raw("别的.ora", null, { side: "cloud", localKey: null, cloudRef: "C9" })] },
    file: () => ({ open: async () => null }) };
  const face = createGalleryDataFace({ store: () => store, policy: { naming: { bare: (s) => s.replace(/\.ora$/, ""), full: (b) => `${b}.ora` } } });
  it("backup：读 listBackup，新的在前，同名两条都在、key 各异、时间解析出来", async () => {
    const rows = await face.listAside("backup");
    eq(rows.map((r) => r.name).join("|"), "稿|稿|别的");
    eq(rows[0].at, new Date(2026, 8, 29, 11, 30, 0).getTime()); eq(rows[1].at, new Date(2026, 8, 29, 10, 0, 0).getTime()); eq(rows[2].at, 0);
    eq(new Set(rows.map((r) => r.key)).size, 3);
    assert(rows.every((r) => r.kind === "backup"));
    eq(rows[2].cloudRef, "C9"); eq(rows[2].localKey, null);
  });
  it("trash：读 listTrash；时间不再恒为 0（0.4.x 的回收站永远显示未知时间）", async () => {
    const rows = await face.listAside("trash");
    eq(rows.length, 1); eq(rows[0].kind, "trash"); eq(rows[0].name, "删掉的");
    eq(rows[0].at, new Date(2026, 8, 1, 8, 0, 0).getTime());
  });
  it("无库 → 抛（界面自己在无库时不调）", async () => {
    const none = createGalleryDataFace({ store: () => null });
    let threw = false; try { await none.listAside("backup"); } catch { threw = true; }
    assert(threw);
  });
});
