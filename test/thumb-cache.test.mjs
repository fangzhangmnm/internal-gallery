import { describe, it, eq, assert } from "./runner.mjs";
import { createThumbCache, thumbKeyFor } from "../src/core/thumbs/thumb-cache.ts";
import { memoryThumbStore } from "../src/core/thumbs/thumb-store.ts";

describe("thumb-cache · token 命中 / miss 拉取 / 拉不到退旧图但不写缓存（诚实不变量）", () => {
  it("同 token 命中；token 变 → 重拉并覆盖同 key", async () => {
    let fetches = 0; const store = memoryThumbStore();
    const c = createThumbCache({ store, fetch: async () => { fetches++; return new Blob([`v${fetches}`]); }, keyOf: (n) => `${n}.ora` });
    const a = await c.getOrFetch("x", "t1", "local"); eq(a.fromCache, false);
    await new Promise((r) => setTimeout(r, 0));
    const b = await c.getOrFetch("x", "t1", "local"); eq(b.fromCache, true); eq(fetches, 1);
    const d = await c.getOrFetch("x", "t2", "local"); eq(d.fromCache, false); eq(fetches, 2);
    eq(c.stats.hits, 1); eq(c.stats.misses, 2);
  });
  it("拉不到：有旧缓存 → 退旧图 fromCache=true 且不覆盖 token；没有 → 抛", async () => {
    const store = memoryThumbStore();
    let fail = false;
    const c = createThumbCache({ store, fetch: async () => { if (fail) throw new Error("offline"); return new Blob(["old"]); }, keyOf: (n) => n });
    await c.getOrFetch("x", "t1", "local"); await new Promise((r) => setTimeout(r, 0));
    fail = true;
    const r = await c.getOrFetch("x", "t2", "cloud"); eq(r.fromCache, true);
    eq((await c.read("x")).token, "t1", "缓存 token 未被新 token 污染");
    let threw = false; try { await c.getOrFetch("y", "t1", "cloud"); } catch { threw = true; } assert(threw);
  });
  it("invalidate：删条目 + 广播 key；多库 key 前缀（legacy default 不加）", async () => {
    const store = memoryThumbStore(); const seen = [];
    const c = createThumbCache({ store, fetch: async () => new Blob(["b"]), keyOf: (n) => thumbKeyFor("g1", `${n}.ora`) });
    c.onInvalidated((k) => seen.push(k));
    await c.getOrFetch("x", "t", "local"); await new Promise((r) => setTimeout(r, 0));
    await c.invalidate("x");
    eq(seen.join(), "g1:x.ora"); eq(await c.read("x"), null);
    eq(thumbKeyFor("default", "x.ora"), "x.ora");
  });
});
