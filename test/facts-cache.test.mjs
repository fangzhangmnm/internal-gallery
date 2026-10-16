// 0.8.0 facts-cache：和 thumb-cache 同一套诚实不变量，值是 JSON。created 2026-10-16 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { createFactsCache, factsKeyFor } from "../src/core/facts/facts-cache.ts";
import { memoryThumbStore } from "../src/core/thumbs/thumb-store.ts";
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("facts-cache · token 命中 / miss 拉取 / null 进缓存 / 抛退旧值", () => {
  it("同 token 命中；token 变 → 重拉覆盖；值原样回来", async () => {
    let fetches = 0; const store = memoryThumbStore();
    const c = createFactsCache({ store, fetch: async () => ({ final: { rev: ++fetches } }), keyOf: (id) => id });
    const a = await c.getOrFetch("x.mxl", "t1", "local"); eq(a.fromCache, false); eq(a.value.final.rev, 1);
    await tick();
    const b = await c.getOrFetch("x.mxl", "t1", "local"); eq(b.fromCache, true); eq(b.value.final.rev, 1); eq(fetches, 1);
    const d = await c.getOrFetch("x.mxl", "t2", "cloud"); eq(d.fromCache, false); eq(d.value.final.rev, 2);
    eq(c.stats.hits, 1); eq(c.stats.misses, 2);
  });
  it("null = 确定没有：进缓存，同 token 不重拉", async () => {
    let fetches = 0; const store = memoryThumbStore();
    const c = createFactsCache({ store, fetch: async () => { fetches++; return null; }, keyOf: (id) => id });
    eq((await c.getOrFetch("y", "t", "local")).value, null); await tick();
    const r = await c.getOrFetch("y", "t", "local"); eq(r.fromCache, true); eq(r.value, null); eq(fetches, 1);
  });
  it("抛 = 未知：有旧值退旧值（token 不污染）；没有 → 抛", async () => {
    const store = memoryThumbStore(); let fail = false;
    const c = createFactsCache({ store, fetch: async () => { if (fail) throw new Error("offline"); return { n: 1 }; }, keyOf: (id) => id });
    await c.getOrFetch("x", "t1", "local"); await tick(); fail = true;
    const r = await c.getOrFetch("x", "t2", "cloud"); eq(r.fromCache, true); eq(r.value.n, 1); eq((await c.read("x")).token, "t1");
    let threw = false; try { await c.getOrFetch("z", "t1", "cloud"); } catch { threw = true; } assert(threw);
    eq(c.stats.errors, 2);
  });
  it("invalidate 删条目 + 广播 key；多库前缀同 thumbs", async () => {
    const store = memoryThumbStore(); const seen = [];
    const c = createFactsCache({ store, fetch: async () => 1, keyOf: (id) => factsKeyFor("g1", id) });
    c.onInvalidated((k) => seen.push(k));
    await c.getOrFetch("x", "t", "local"); await tick(); await c.invalidate("x");
    eq(seen.join(), "g1:x"); eq(await c.read("x"), null); eq(factsKeyFor("default", "x"), "x");
  });
});
