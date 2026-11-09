// 0.8.12（周账 F-228）：加密件的封面——解密、显示、锁上时撤掉（core/model/sealed-cover.ts）。created 2026-11-08 by Claude Fable 5.1
// user 2026-11-08：「我点了那个 Lock Encrypted Works Forgot Password 之后，我还是能看见之前加密的东西，可能得 App 退回去重新新刷新」。
import { describe, it, eq, assert } from "./runner.mjs";
import { createSealedCover } from "../src/core/model/sealed-cover.ts";

const PNG = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
/** 一个假格子：记着显示了什么、锁没锁；decrypt 的结果由测试控制（可以挂起，测「在飞」）。 */
function cell({ unlocked = true, source = true, shown = "none", locked = false } = {}) {
  const c = { unlocked, source, shown, locked, png: PNG, decryptCalls: 0, errors: [], log: [], pending: null };
  c.cover = createSealedCover({
    isUnlocked: () => c.unlocked, hasSource: () => c.source,
    decrypt: () => { c.decryptCalls++; if (c.pending) return c.pending.promise; if (c.throwOnce) { const e = c.throwOnce; c.throwOnce = null; return Promise.reject(e); } return Promise.resolve(c.unlocked ? c.png : c.leak ?? null); },
    shown: () => c.shown, locked: () => c.locked,
    show: () => { c.shown = "decrypted"; c.log.push("show"); }, clear: () => { c.shown = "none"; c.log.push("clear"); },
    setLocked: (v) => { c.locked = v; }, onError: (e) => c.errors.push(e),
  });
  c.hold = () => { let res; const promise = new Promise((r) => { res = r; }); c.pending = { promise, res }; };
  c.release = (v) => { const p = c.pending; c.pending = null; p.res(v); return p.promise.then(() => new Promise((r) => setTimeout(r, 0))); };
  return c;
}

describe("sealed-cover · 解锁着", () => {
  it("解得开 → 显示解密得来的封面，不显示锁", async () => {
    const c = cell(); await c.cover.tryDecrypt();
    eq(c.shown, "decrypted"); eq(c.locked, false);
  });
  it("解锁了但这份没有封面 → 占位，不是锁（锁只表示解不开）", async () => {
    const c = cell(); c.png = null; await c.cover.tryDecrypt();
    eq(c.shown, "none"); eq(c.locked, false);
  });
  it("转进解密这条路之前，明文时代显示着的那张先撤（0.8.11 的规矩）", async () => {
    const c = cell({ shown: "plain" }); c.hold(); const p = c.cover.tryDecrypt();
    eq(c.shown, "none", "还没解完就已经撤了"); await c.release(PNG); await p;
    eq(c.shown, "decrypted");
  });
  it("上一版解出来显示着，这一版解不出封面了 → 旧的那张不留", async () => {
    const c = cell(); await c.cover.tryDecrypt(); c.png = null; await c.cover.tryDecrypt();
    eq(c.shown, "none"); eq(c.locked, false);
  });
});

describe("sealed-cover · 锁上（忘掉密码）", () => {
  it("本地加密件：显示着解密封面 → 锁上那一刻同步撤掉、显示锁，不等任何异步", async () => {
    const c = cell(); await c.cover.tryDecrypt(); eq(c.shown, "decrypted");
    c.unlocked = false; c.cover.onLockChange(false);
    eq(c.shown, "none", "返回时图已经撤了"); eq(c.locked, true);
  });
  it("纯云端的加密件（来源 = 密文 peek，之前没显示锁）：一样撤、一样上锁（0.8.11 及以前这种根本不重新检查）", async () => {
    const c = cell({ source: true, locked: false }); await c.cover.tryDecrypt();
    c.unlocked = false; c.cover.onLockChange(false);
    eq(c.shown, "none"); eq(c.locked, true);
  });
  it("锁上不再去调宿主的解密", async () => {
    const c = cell(); await c.cover.tryDecrypt(); const n = c.decryptCalls;
    c.unlocked = false; c.cover.onLockChange(false); await new Promise((r) => setTimeout(r, 0));
    eq(c.decryptCalls, n);
  });
  it("锁上之前开始、锁上之后才解完的那一次：结果作废，不显示", async () => {
    const c = cell(); c.hold(); const p = c.cover.tryDecrypt();
    c.unlocked = false; c.cover.onLockChange(false);
    await c.release(PNG); await p;
    eq(c.shown, "none"); eq(c.locked, true); assert(!c.log.includes("show"), "从头到尾没显示过");
  });
  it("锁着的时候，哪怕宿主的解密回了图也不显示（这一层自己拦，不指望宿主那时一定失败）", async () => {
    const c = cell({ unlocked: false }); c.leak = PNG; await c.cover.tryDecrypt();
    eq(c.shown, "none"); eq(c.locked, true);
  });
  it("没加密的作品（没有密文来源、显示着明文封面）不受影响", () => {
    const c = cell({ source: false, shown: "plain" });
    c.unlocked = false; c.cover.onLockChange(false);
    eq(c.shown, "plain"); eq(c.locked, false);
  });
  it("来源已经没了、但还显示着解密得来的图（刚解除加密、新图还没拉到）→ 锁上也撤", () => {
    const c = cell({ source: false, shown: "decrypted" });
    c.unlocked = false; c.cover.onLockChange(false);
    eq(c.shown, "none"); eq(c.locked, false, "没有密文来源 → 不显示锁，回占位");
  });
});

describe("sealed-cover · 再解锁、出错", () => {
  it("锁上再解锁 → 重新解、重新显示", async () => {
    const c = cell(); await c.cover.tryDecrypt();
    c.unlocked = false; c.cover.onLockChange(false);
    c.unlocked = true; c.cover.onLockChange(true); await new Promise((r) => setTimeout(r, 0));
    eq(c.shown, "decrypted"); eq(c.locked, false);
  });
  it("解锁时：没有密文来源、也没显示锁的格子不去解", async () => {
    const c = cell({ source: false, shown: "plain" });
    c.cover.onLockChange(true); await new Promise((r) => setTimeout(r, 0));
    eq(c.decryptCalls, 0); eq(c.shown, "plain");
  });
  it("解密抛了（不是解不开，是出错）→ 不显示图、错误报出去不吞", async () => {
    const c = cell(); await c.cover.tryDecrypt(); c.throwOnce = new Error("boom");
    await c.cover.tryDecrypt();
    eq(c.shown, "none"); eq(c.errors.length, 1); eq(c.locked, false);
  });
  it("连着两次试解：先发的晚到，不盖后发的结果", async () => {
    const c = cell(); c.hold(); const first = c.pending; const p1 = c.cover.tryDecrypt();
    c.pending = null; c.png = null; await c.cover.tryDecrypt();   // 后发的：这一版没有封面
    first.res(PNG); await p1;
    eq(c.shown, "none", "先发的那张晚到，不显示");
  });
});
