// 卡片的「事实」缓存（0.8.0，2026-10-16 Claude Fable 5.1；user「图库包批了」）：不开文件就想知道的一点东西——定稿了没、字数、进度……
//   宿主的 fetch 按身份尾读文件（store getPeek 之类）回一个 JSON 值；本包按「身份 + 字节版本（token = lastModified / size）」缓存、字节变了重取、
//   取不到退旧值。形状和 thumb-cache 一样（同一套诚实不变量）：fetch 返 **null = 确定没有**（照样进缓存）；**抛 = 未知**（不写缓存、退旧值）。
//   本包不认识值的内容（content-blind）：它只是「身份 → 一个 JSON」的派生缓存，全删可再生（家族 2026-08-15 逐案批的形状：独立 DB、key = 身份、token、可再生）。
//   第一个消费者 = MoonSinger：fetch 尾读 `.moonsinger/manifest.json` 回 `{ final: { rev, secs } }`，卡片上按它画「听定稿的 mp3」那粒钮（ui.tileAction）。
import type { ThumbStore } from "../thumbs/thumb-store.ts";

export type FactsSource = "local" | "cloud";
export interface CachedFacts { token: string; value: unknown; at: number }
export interface FactsCacheDeps {
  store: ThumbStore;
  /** 真取（app 域）：JSON 值；null = 确定没有（缓存）；抛 = 未知（不缓存）。值必须能 structured-clone（进 IDB）。 */
  fetch: (identifier: string, source: FactsSource) => Promise<unknown>;
  keyOf: (identifier: string) => string;
  report?: (err: unknown) => void;
  now?: () => number;
}
export interface FactsCache {
  read(identifier: string): Promise<CachedFacts | null>;
  write(identifier: string, token: string, value: unknown): Promise<void>;
  invalidate(identifier: string): Promise<void>;
  onInvalidated(fn: (key: string) => void): () => void;
  getOrFetch(identifier: string, token: string, source: FactsSource): Promise<{ value: unknown; fromCache: boolean }>;
  clear(): Promise<number>;
  readonly stats: { hits: number; misses: number; errors: number };
}
export const factsKeyFor = (galleryId: string, identifier: string): string => (galleryId === "default" ? identifier : `${galleryId}:${identifier}`);

export function createFactsCache(deps: FactsCacheDeps): FactsCache {
  const now = deps.now ?? (() => Date.now());
  const stats = { hits: 0, misses: 0, errors: 0 };
  const listeners = new Set<(key: string) => void>();
  async function read(identifier: string): Promise<CachedFacts | null> {
    try { const v = await deps.store.get(deps.keyOf(identifier)) as CachedFacts | undefined; return v && typeof v.token === "string" && "value" in v ? v : null; } catch { return null; }
  }
  async function write(identifier: string, token: string, value: unknown): Promise<void> {
    try { await deps.store.set(deps.keyOf(identifier), { token, value, at: now() } satisfies CachedFacts); }
    catch (e) { deps.report?.(new Error("[facts-cache] write failed: " + String(e))); }
  }
  return {
    read, write,
    async invalidate(identifier) {
      const key = deps.keyOf(identifier);
      try { await deps.store.delete(key); } catch { /* best-effort */ }
      for (const fn of listeners) { try { fn(key); } catch { /* listener 自理 */ } }
    },
    onInvalidated(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    async getOrFetch(identifier, token, source) {
      const c = await read(identifier);
      if (c && c.token === token) { stats.hits++; return { value: c.value, fromCache: true }; }
      stats.misses++;
      try {
        const value = await deps.fetch(identifier, source);
        void write(identifier, token, value ?? null);
        return { value: value ?? null, fromCache: false };
      } catch (e) {
        stats.errors++;
        if (c) return { value: c.value, fromCache: true };   // 退旧值但不写缓存（token 不被新的污染）
        throw e;
      }
    },
    async clear() { const n = await deps.store.clear(); stats.hits = stats.misses = stats.errors = 0; return n; },
    stats,
  };
}
