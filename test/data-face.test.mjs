import { describe, it, eq, assert } from "./runner.mjs";
import { createGalleryDataFace, galleryItemFromStoreItem } from "../src/core/data-face.ts";

import { createIdentifiers } from "@internal/store";
const WP = createIdentifiers([{ kind: "painting", suffix: ".ora", container: "zip" }]);
const WX = createIdentifiers([{ kind: "book", suffix: ".webxiaoheiwu.zip", container: "zip" }, { kind: "draft", suffix: ".txt", container: "raw" }]);
const item = (identifier, syncState, extra = {}) => ({ identifier, syncState, ...extra });
const fakeStore = (snap, ids = WP) => ({ identifiers: ids, files: { watchFolder: (folder, cb) => { cb({ folder, ...snap, complete: true }); return () => {}; }, listTrash: async () => [], listBackup: async () => [] }, file: () => ({ open: async () => null }) });

describe("data-face · store.Item → GItem（0.4.0：syncState 原样透传，不派生布尔；0.6.0：identifier / stem / kind 由 store.identifiers 切）", () => {
  it("identifier + stem + kind + syncState + size/lastModified；没有 local/cloud/dirty 字段", () => {
    const g = galleryItemFromStoreItem(item("a.ora", "synced", { size: 5, lastModified: 1000 }), WP);
    eq(g.identifier, "a.ora"); eq(g.stem, "a"); eq(g.kind, "painting"); eq(g.syncState, "synced"); eq(g.size, 5); eq(g.lastModified, 1000);
    assert(!("local" in g) && !("cloud" in g) && !("dirty" in g) && !("name" in g), "不再派生布尔；没有 name");
    eq(galleryItemFromStoreItem(item("b.ora", "conflict"), WP).syncState, "conflict");
  });
  it("多段后缀的宿主：主干去掉整个后缀；不是文档 → null", () => {
    const g = galleryItemFromStoreItem(item("夹/x.webxiaoheiwu.zip", "synced"), WX);
    eq(g.identifier, "夹/x.webxiaoheiwu.zip"); eq(g.stem, "x"); eq(g.kind, "book");
    eq(galleryItemFromStoreItem(item("夹/x.ora", "synced"), WX), null, "WXHW 的表不认 .ora");
    eq(galleryItemFromStoreItem(item("pic.png", "synced"), WP), null);
  });
});

describe("data-face · watchFolder 路由与排序（当前夹唯一列举面）", () => {
  const snap = { items: [item("2.ora", "synced"), item("10.ora", "synced"), item("pic.png", "cloud-only", { lastModified: 5 }), item("old.png", "synced", { lastModified: 1 }), item("notes.md", "synced"), item("1.ora", "float")], folders: ["sub10", "sub2"] };
  it("文档 = 表认得的（按主干 natural 倒序）/ 图片按时间倒序 / 杂物自然正序 / 子夹自然正序；快照带 folder", () => {
    const face = createGalleryDataFace({ store: () => fakeStore(snap) });
    let got; face.watchFolder("", (s) => { got = s; });
    eq(got.folder, "");
    eq(got.items.map((i) => i.identifier).join("|"), "10.ora|2.ora|1.ora", "natural 倒序：10 > 2 > 1");
    eq(got.items.map((i) => i.stem).join("|"), "10|2|1");
    eq(got.images.map((i) => i.label).join("|"), "pic.png|old.png"); eq(got.images[0].identifier, "pic.png");
    eq(got.images[1].cached, true, "synced 图片 = 本地有副本");
    eq(got.others.map((i) => i.label).join("|"), "notes.md", "杂物显示不打开");
    eq(got.folderNames.join("|"), "sub2|sub10", "folderNames 是「移动到…」的名单，自然正序，不是显示顺序");
    eq(got.timeline.map((e) => e.type === "folder" ? `[${e.name}]` : e.type === "doc" ? e.item.identifier : `${e.type}:${e.file.label}`).join("|"),
      "[sub10]|[sub2]|image:pic.png|image:old.png|other:notes.md|10.ora|2.ora|1.ora", "0.8.12 作品和子夹合成一列；0.9.2 图片 / 杂物也在里面（都不带日期 → 名字自然倒序，不分类型）");
  });
  it("0.8.12：带日期的子夹落在时间线中间；items 和 timeline 里的作品同一顺序", () => {
    const face = createGalleryDataFace({ store: () => fakeStore({ items: [item("20240101 a.ora", "synced"), item("日记.ora", "synced"), item("20250101 b.ora", "synced")], folders: ["20240601 旅行"] }) });
    let got; face.watchFolder("", (s) => { got = s; });
    eq(got.timeline.map((e) => e.type === "folder" ? `[${e.name}]` : e.item.stem).join("|"), "日记|20250101 b|[20240601 旅行]|20240101 a");
    eq(got.items.map((i) => i.stem).join("|"), "日记|20250101 b|20240101 a");
  });
  it("0.9.2：带日期的图片 / 认不出来的文件落在时间线上自己的日期位置（日期比文件类型优先）；不带日期的和别的一起在最上面", () => {
    const face = createGalleryDataFace({ store: () => fakeStore({ items: [item("20240101 a.ora", "synced"), item("20240301 草图.png", "synced", { lastModified: 1 }), item("20231201 笔记.md", "synced"), item("CLAUDE.md", "synced"), item("20250101 b.ora", "synced")], folders: [] }) });
    let got; face.watchFolder("", (s) => { got = s; });
    eq(got.timeline.map((e) => e.type === "doc" ? e.item.stem : `${e.type}:${e.file.label}`).join("|"), "other:CLAUDE.md|20250101 b|image:20240301 草图.png|20240101 a|other:20231201 笔记.md");
    eq(got.images.length, 1); eq(got.others.length, 2, "images / others 两个数组照旧在（别的消费方用）");
  });
  it("换一张表（WXHW：.txt + .webxiaoheiwu.zip）→ ora 变杂物；哪些是文档由 store 说，本包没有 isDoc 钩子", () => {
    const face = createGalleryDataFace({ store: () => fakeStore({ items: [item("a.txt", "synced"), item("p.webxiaoheiwu.zip", "synced"), item("x.ora", "synced")], folders: [] }, WX), policy: { isImage: () => false } });
    let got; face.watchFolder("", (s) => { got = s; });
    eq(got.items.map((i) => i.identifier).join("|"), "p.webxiaoheiwu.zip|a.txt");
    eq(got.items.map((i) => i.kind).join("|"), "book|draft");
    eq(got.others.map((i) => i.identifier).join("|"), "x.ora");
  });
  it("子夹订阅：folderNames 去掉当前夹前缀", () => {
    const face = createGalleryDataFace({ store: () => fakeStore({ items: [], folders: ["A/b", "A/a"] }) });
    let got; face.watchFolder("A", (s) => { got = s; });
    eq(got.folderNames.join("|"), "a|b");
  });
  it("无库（store 返回 null）→ 抛，不给假帧", () => {
    const face = createGalleryDataFace({ store: () => null });
    let threw = false; try { face.watchFolder("", () => {}); } catch { threw = true; }
    assert(threw);
  });
});
