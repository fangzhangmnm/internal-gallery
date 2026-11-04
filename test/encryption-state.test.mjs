// 0.8.11 加密态判定 + 明文副产品作废（CatsUp 2026-11-03 报告「C2」「C3 追加」）。created 2026-11-04 by Claude Opus 5.5
// 判定 = 本地字节 ∨ store 的事实（今天能拿到的 store 事实 = getPeek 回的密文 peek）；结论绑版本戳。
// ⚠ 「云端名带容器后缀」这一路 store 的 Item 还不带（截至 2.2.5），这里测不到——见发版说明 §3。
import { describe, it, eq, assert } from "./runner.mjs";
import { createEncryptionState, encVersionOf, encryptionMenu, admitThumbBlob, dropPlainByproducts } from "../src/core/model/encryption-state.ts";
import { tileFor } from "../src/core/model/gallery-view-model.ts";
import { createThumbCache } from "../src/core/thumbs/thumb-cache.ts";
import { createFactsCache } from "../src/core/facts/facts-cache.ts";
import { memoryThumbStore } from "../src/core/thumbs/thumb-store.ts";

const ENC_PEEK_MIME = "application/x-enc-peek";   // 测试替身：store 给密文 peek 打的 MIME
const isEncPeek = (b) => b.type === ENC_PEEK_MIME;
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("加密态 · 本地字节 ∨ store 的事实（0.8.11）", () => {
  it("纯云端、本地没字节的一份：store 的 peek 说是加密容器 → 锁亮（tile.encrypted）；菜单不给「加密…」也不给「解除加密…」", () => {
    const st = createEncryptionState();
    const item = { identifier: "夹/画.ora", stem: "画", kind: "ora", syncState: "cloud-only", lastModified: 2000, size: 900 };
    const v = encVersionOf(item);
    // 探本地：没字节 → 本地这一路记 false
    assert(st.needsLocalProbe(item.identifier, v)); st.noteLocal(item.identifier, v, false);
    eq(st.isEncrypted(item.identifier, v), false, "还没有任何一路说加密");
    // 格子拉回来的是密文 peek（store 打的 MIME）→ 报回来
    const verdict = admitThumbBlob(new Blob(["x"], { type: ENC_PEEK_MIME }), { sealed: false, isEncryptedPeekBlob: isEncPeek });
    eq(verdict, "enc-peek");
    st.notePeek(item.identifier, v);
    const enc = st.isEncrypted(item.identifier, v), local = st.isLocalEncrypted(item.identifier, v);
    const tile = tileFor(item, { signedIn: true, activeIdentifier: null, encrypted: enc });
    eq(tile.encrypted, true, "锁亮");
    eq(local, false, "本地字节那一路仍然没说加密（不走本地解密封面那条路）");
    const m = encryptionMenu({ hasEncryption: true, hasLocal: tile.hasLocal, encrypted: enc, localEncrypted: local });
    eq(m.encrypt, false, "不给「加密…」"); eq(m.decrypt, false, "纯云端没有本地字节，不给「解除加密…」");
  });

  it("本地旧明文探过 = 不加密；别的设备加密、这台快进拿到容器（版本变了）→ 重探 → 锁亮、给「解除加密…」不给「加密…」", () => {
    const st = createEncryptionState();
    const v1 = encVersionOf({ syncState: "synced", lastModified: 1000, size: 500 });
    st.noteLocal("a.ora", v1, false);
    eq(st.needsLocalProbe("a.ora", v1), false, "同一版不重探");
    // 别的设备加密 → 这台列表上 newer-on-cloud（版本变）：本地字节仍是旧明文
    const v2 = encVersionOf({ syncState: "newer-on-cloud", lastModified: 2000, size: 900 });
    assert(st.needsLocalProbe("a.ora", v2), "版本变了要重探（0.8.10 按名字记一次就不再看）");
    st.noteLocal("a.ora", v2, false); st.notePeek("a.ora", v2);
    eq(st.isEncrypted("a.ora", v2), true, "云端那一路说加密 → 锁亮");
    let m = encryptionMenu({ hasEncryption: true, hasLocal: true, encrypted: true, localEncrypted: st.isLocalEncrypted("a.ora", v2) });
    eq(m.encrypt, false, "本地还是明文、云端已加密：不给「加密…」（会推出和云端分叉的容器）");
    eq(m.decrypt, false, "也不给「解除加密…」（store 会回「这不是加密作品」）");
    // 快进：本地字节成了容器
    const v3 = encVersionOf({ syncState: "synced", lastModified: 2000, size: 900 });
    assert(st.needsLocalProbe("a.ora", v3));
    st.noteLocal("a.ora", v3, true);
    eq(st.isEncrypted("a.ora", v3), true); eq(st.isLocalEncrypted("a.ora", v3), true);
    m = encryptionMenu({ hasEncryption: true, hasLocal: true, encrypted: true, localEncrypted: true });
    eq(m.encrypt, false); eq(m.decrypt, true, "本地确实是容器 → 给「解除加密…」");
  });

  it("peek 那一路只认同一版（别的设备解除加密后不粘着）；本地那一路在重探前沿用上一版；forget 清空", () => {
    const st = createEncryptionState();
    st.noteLocal("c.ora", "v1", false); st.notePeek("c.ora", "v1");
    eq(st.isEncrypted("c.ora", "v1"), true);
    eq(st.isEncrypted("c.ora", "v2"), false, "新版本上 peek 的旧结论不算");
    st.noteLocal("d.ora", "v1", true);
    eq(st.isEncrypted("d.ora", "v2"), true, "本地那一路：重探之前沿用（锁不闪）");
    st.noteLocal("d.ora", "v2", false);
    eq(st.isEncrypted("d.ora", "v2"), false, "重探说明文 → 不加密");
    st.forget("c.ora"); assert(st.needsLocalProbe("c.ora", "v1")); eq(st.isEncrypted("c.ora", "v1"), false);
  });

  it("菜单：明文本地件给「加密…」；没有加密端口两项都不给", () => {
    eq(encryptionMenu({ hasEncryption: true, hasLocal: true, encrypted: false, localEncrypted: false }).encrypt, true);
    const none = encryptionMenu({ hasEncryption: false, hasLocal: true, encrypted: true, localEncrypted: true });
    eq(none.encrypt, false); eq(none.decrypt, false);
  });
});

describe("加密件明文副产品作废（0.8.11）", () => {
  it("本地缓存里有加密之前的明文封面、现在知道它加密了 → 删掉，拉不到新图时也不再退回旧明文图；格子拿到明文图一律拒", async () => {
    const store = memoryThumbStore();
    let offline = false;
    const thumbs = createThumbCache({ store, fetch: async () => { if (offline) throw new Error("cloud unreachable"); return new Blob(["plain-cover"], { type: "image/png" }); }, keyOf: (n) => n });
    // 加密之前：明文封面进了缓存
    await thumbs.getOrFetch("画.ora", "t1", "local"); await tick();
    eq((await thumbs.read("画.ora")).blob.type, "image/png");
    // 0.8.10 的洞：版本变了（别的设备加密）+ 云端不可达 → 缓存退回旧明文
    offline = true;
    const stale = await thumbs.getOrFetch("画.ora", "t2", "cloud");
    eq(stale.fromCache, true); eq(stale.blob.type, "image/png", "（洞的复现）缓存层照旧退回明文");
    // 修：格子侧已知加密 → 这张明文图不显示
    eq(admitThumbBlob(stale.blob, { sealed: true, isEncryptedPeekBlob: isEncPeek }), "refuse", "已知加密 → 退回来的明文旧图不显示");
    eq(admitThumbBlob(stale.blob, { sealed: true }), "refuse", "没有加密端口也拒");
    eq(admitThumbBlob(stale.blob, { sealed: false, isEncryptedPeekBlob: isEncPeek }), "show", "不知道加密 → 照旧显示");
    // 修：一知道就删缓存里的明文条目（不等格子滚到眼前）
    const seen = []; thumbs.onInvalidated((k) => seen.push(k));
    const r = await dropPlainByproducts("画.ora", { thumbs, isEncryptedPeekBlob: isEncPeek });
    eq(r.thumb, true); eq(await thumbs.read("画.ora"), null, "明文条目没了"); eq(seen.join(), "画.ora", "广播让格子重来");
    let threw = false; try { await thumbs.getOrFetch("画.ora", "t2", "cloud"); } catch { threw = true; }
    assert(threw, "拉不到 → 没有旧明文可退了（未知 = 抛，格子显示占位）");
  });

  it("密文 peek 的缓存条目留着（它本来就是密文）；卡片事实里明文时代的值删掉", async () => {
    const thumbs = createThumbCache({ store: memoryThumbStore(), fetch: async () => new Blob(["c"], { type: ENC_PEEK_MIME }), keyOf: (n) => n });
    await thumbs.getOrFetch("b.ora", "t1", "cloud"); await tick();
    const facts = createFactsCache({ store: memoryThumbStore(), fetch: async () => ({ words: 1234 }), keyOf: (n) => n });
    await facts.getOrFetch("b.ora", "t1", "local"); await tick();
    const r = await dropPlainByproducts("b.ora", { thumbs, facts, isEncryptedPeekBlob: isEncPeek });
    eq(r.thumb, false, "密文 peek 不删"); eq((await thumbs.read("b.ora")).blob.type, ENC_PEEK_MIME);
    eq(r.facts, true); eq(await facts.read("b.ora"), null, "明文时代的事实删掉");
    const again = await dropPlainByproducts("b.ora", { thumbs, facts, isEncryptedPeekBlob: isEncPeek });
    eq(again.thumb, false); eq(again.facts, false, "没有可删的 → 什么都不动");
  });
});
