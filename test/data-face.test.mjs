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
    eq(got.folderNames.join("|"), "sub2|sub10");
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
