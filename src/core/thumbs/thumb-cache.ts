// 缩略图缓存（WET 自 WeebPaint src/gallery/cloud-thumb-cache.ts v137→v0.10.2，2026-09-09 包化）。
// 存法：key = store 文件身份（policy.naming.full(裸名)），多库时前缀 galleryId（legacy "default" 不加前缀，存量零迁移）；
//   value = { token, blob, at }。token 变 = 文件改了 → 重拉 + 覆盖同 key。加密件：fetch 返**密文** peek，缓存原样存密文（明文缩略图不落 IDB）。
// ⚠ 缓存诚实不变量（QA 2026-08-21）：写进缓存的字节必须与 token 同源——token 走云端戳时 source 必须 "cloud"，取不到绝不写缓存。
// 0.2.2 否定结果（WXHW 2026-09-10 user「thumb 不是用来显示 cloud status 的地方，应该是书，未知的话是另外一回事可以显示云」）：
//   fetch 返 **null = 确定没有缩略图**（到达了但 entry 不存在）→ 照样进缓存（{token, blob:null}），下次同 token 命中不重拉；
//   fetch **抛 = 未知**（够不着 / 离线）→ 不写缓存、退旧值；屏幕侧只有这种才给云端-only 的卡显示云。
import type { ThumbStore } from "./thumb-store.ts";

export interface CachedThumb { token: string; blob: Blob | null; at: number; }
export type ThumbSource = "local" | "cloud";
export interface ThumbCacheDeps {
  store: ThumbStore;
  /** 真取图（app 域：ora 的 Thumbnails/thumbnail.png 经 store getPeek）。null = 确定没有（缓存）；抛 = 未知（不缓存）。 */
  fetch: (name: string, source: ThumbSource) => Promise<Blob | null>;
  /** 裸名 → 缓存 key（store 身份 + 多库前缀）。 */
  keyOf: (name: string) => string;
  report?: (err: unknown) => void;
  now?: () => number;
}
export interface ThumbCache {
  read(name: string): Promise<CachedThumb | null>;
  write(name: string, token: string, blob: Blob | null): Promise<void>;
  invalidate(name: string): Promise<void>;
  onInvalidated(fn: (key: string) => void): () => void;
  getOrFetch(name: string, token: string, source: ThumbSource): Promise<{ blob: Blob | null; fromCache: boolean }>;
  clear(): Promise<number>;
  readonly stats: { hits: number; misses: number; errors: number };
  readonly config: { skipCache: boolean };
}
/** 多库 key：legacy 库 id "default" 不加前缀（WeebPaint 存量缓存零迁移）。 */
export const thumbKeyFor = (galleryId: string, fullName: string): string => (galleryId === "default" ? fullName : `${galleryId}:${fullName}`);

export function createThumbCache(deps: ThumbCacheDeps): ThumbCache {
  const now = deps.now ?? (() => Date.now());
  const stats = { hits: 0, misses: 0, errors: 0 };
  const config = { skipCache: false };
  const listeners = new Set<(key: string) => void>();
  async function read(name: string): Promise<CachedThumb | null> {
    try { const v = await deps.store.get(deps.keyOf(name)) as CachedThumb | undefined; return v && v.token && (v.blob instanceof Blob || v.blob === null) ? v : null; } catch { return null; }
  }
  async function write(name: string, token: string, blob: Blob | null): Promise<void> {
    try { await deps.store.set(deps.keyOf(name), { token, blob, at: now() }); }
    catch (e) { deps.report?.(new Error("[thumb-cache] write failed: " + String(e))); }
  }
  return {
    read, write,
    async invalidate(name) {
      const key = deps.keyOf(name);
      try { await deps.store.delete(key); } catch { /* best-effort */ }
      for (const fn of listeners) { try { fn(key); } catch { /* listener 自理 */ } }
    },
    onInvalidated(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    async getOrFetch(name, token, source) {
      if (!config.skipCache) { const c = await read(name); if (c && c.token === token) { stats.hits++; return { blob: c.blob, fromCache: true }; } }
      stats.misses++;
      try {
        const blob = await deps.fetch(name, source);
        if (!config.skipCache) void write(name, token, blob);
        return { blob, fromCache: false };
      } catch (e) {
        stats.errors++;
        if (!config.skipCache) { const stale = await read(name); if (stale) return { blob: stale.blob, fromCache: true }; }   // 退旧图但不写缓存
        throw e;
      }
    },
    async clear() { const n = await deps.store.clear(); stats.hits = stats.misses = stats.errors = 0; return n; },
    stats, config,
  };
}
