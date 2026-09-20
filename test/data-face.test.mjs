import { describe, it, eq, assert } from "./runner.mjs";
import { createGalleryDataFace, galleryItemFromStoreItem } from "../src/core/data-face.ts";

const item = (path, syncState, extra = {}) => ({ path, syncState, ...extra });
const fakeStore = (snap) => ({ files: { watchFolder: (folder, cb) => { cb({ path: folder, ...snap, complete: true }); return () => {}; }, listTrash: async () => [] }, file: () => ({ open: async () => null }) });

describe("data-face · store.Item → GItem（0.4.0：syncState 原样透传，不派生布尔）", () => {
  it("name 裸名 + syncState + size/lastModified；没有 local/cloud/dirty 字段", () => {
    const g = galleryItemFromStoreItem(item("a.ora", "synced", { size: 5, lastModified: 1000 }));
    eq(g.syncState, "synced"); eq(g.size, 5); eq(g.lastModified, 1000);
    assert(!("local" in g) && !("cloud" in g) && !("dirty" in g), "不再派生布尔");
    eq(galleryItemFromStoreItem(item("b.ora", "conflict")).syncState, "conflict");
  });
  it("naming.bare 决定显示身份（WeebPaint：去 .ora；身份=全名的 app：恒等）", () => {
    eq(galleryItemFromStoreItem(item("夹/x.ora", "synced"), { bare: (s) => s.replace(/\.ora$/, ""), full: (b) => b + ".ora" }).name, "夹/x");
    eq(galleryItemFromStoreItem(item("夹/x.webxiaoheiwu.zip", "synced")).name, "夹/x.webxiaoheiwu.zip");
  });
});

describe("data-face · watchFolder 路由与排序（当前夹唯一列举面）", () => {
  const snap = { items: [item("2.ora", "synced"), item("10.ora", "synced"), item("pic.png", "cloud-only", { lastModified: 5 }), item("old.png", "synced", { lastModified: 1 }), item("notes.md", "synced"), item("1.ora", "float")], folders: ["sub10", "sub2"] };
  it("默认 policy（WeebPaint 白名单）：文档 natural 倒序 / 图片按时间倒序 / 杂物自然正序 / 子夹自然正序", () => {
    const face = createGalleryDataFace({ store: () => fakeStore(snap) });
    let got; face.watchFolder("", (s) => { got = s; });
    eq(got.items.map((i) => i.name).join("|"), "10.ora|2.ora|1.ora", "natural 倒序：10 > 2 > 1");
    eq(got.images.map((i) => i.name).join("|"), "pic.png|old.png");
    eq(got.images[1].cached, true, "synced 图片 = 本地有副本");
    eq(got.others.map((i) => i.name).join("|"), "notes.md", "杂物显示不打开");
    eq(got.folderNames.join("|"), "sub2|sub10");
  });
  it("policy.isDoc 换白名单（WXHW：.txt + .webxiaoheiwu.zip）→ md 不再是杂物之外、ora 变杂物", () => {
    const face = createGalleryDataFace({ store: () => fakeStore({ items: [item("a.txt", "synced"), item("p.webxiaoheiwu.zip", "synced"), item("x.ora", "synced")], folders: [] }), policy: { isDoc: (p) => /\.(txt|webxiaoheiwu\.zip)$/.test(p), isImage: () => false } });
    let got; face.watchFolder("", (s) => { got = s; });
    eq(got.items.map((i) => i.name).join("|"), "p.webxiaoheiwu.zip|a.txt");
    eq(got.others.map((i) => i.name).join("|"), "x.ora");
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
