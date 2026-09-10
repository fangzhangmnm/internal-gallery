// 缩略图缓存的存储面：包自己的派生缓存 IDB（家族 2026-08-15 逐案批准的形状：独立 DB、key = store 文件身份、token = lastModified/size、全删可再生）。
// WeebPaint src/storage.ts 的 thumb 段 WET 过来；测试/无 IDB 环境用 memoryThumbStore。
export interface ThumbStore {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<number>;
}
export function memoryThumbStore(): ThumbStore {
  const m = new Map<string, unknown>();
  return { async get(k) { return m.get(k); }, async set(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); }, async clear() { const n = m.size; m.clear(); return n; } };
}
/** IndexedDB 实现：一个 DB 一个 object store（keyPath 无，out-of-line key）。打开失败自动重试一次（WeebPaint openDB 的自愈）。 */
export function idbThumbStore(opts: { dbName: string; storeName?: string; version?: number }): ThumbStore {
  const storeName = opts.storeName ?? "thumbs", version = opts.version ?? 1;
  let _db: Promise<IDBDatabase> | null = null;
  const open = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
    const req = indexedDB.open(opts.dbName, version);
    req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("idb open blocked"));
  });
  const db = (): Promise<IDBDatabase> => { if (_db) return _db; _db = open().catch(async (e1) => { try { return await open(); } catch { _db = null; throw e1; } }); return _db; };
  const tx = async <T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> => {
    const d = await db();
    return new Promise<T>((resolve, reject) => {
      const t = d.transaction(storeName, mode); const s = t.objectStore(storeName); const r = run(s);
      let out: T | undefined;
      if (r) { r.onsuccess = () => { out = r.result; }; r.onerror = () => reject(r.error); }
      t.oncomplete = () => resolve(out as T); t.onerror = () => reject(t.error);
    });
  };
  return {
    get: (k) => tx<unknown>("readonly", (s) => s.get(k)),
    set: (k, v) => tx<void>("readwrite", (s) => { s.put(v, k); }),
    delete: (k) => tx<void>("readwrite", (s) => { s.delete(k); }),
    clear: () => tx<number>("readwrite", (s) => { const c = s.count(); c.onsuccess = () => { s.clear(); }; return c as unknown as IDBRequest<number>; }),
  };
}
