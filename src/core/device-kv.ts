// 本机 KV seam：包永不直碰 localStorage（家规）。宿主 configureDeviceKv(实现)；不配 = 内存（测试 / 无持久化宿主）。
// 四个函数名与 WeebPaint src/device-kv.ts 逐字同，搬进来的 resume-slate / diag-log 零改动。
export interface DeviceKv { get(key: string): string | null; set(key: string, v: string | null): void; }
const _mem = new Map<string, string>();
let _kv: DeviceKv = { get: (k) => _mem.get(k) ?? null, set: (k, v) => { if (v == null) _mem.delete(k); else _mem.set(k, v); } };
export function configureDeviceKv(kv: DeviceKv): void { _kv = kv; }
export function deviceKvGet(key: string): string | null { try { return _kv.get(key); } catch { return null; } }
export function deviceKvSet(key: string, v: string | null): void { try { _kv.set(key, v); } catch { /* 存不进（私密模式/配额）= 静默，读侧回退默认 */ } }
export function deviceKvGetJson<T>(key: string, fallback: T): T {
  const raw = deviceKvGet(key); if (raw == null) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}
export function deviceKvSetJson(key: string, v: unknown): void { deviceKvSet(key, v === undefined ? null : JSON.stringify(v)); }
