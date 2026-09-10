// 包内文案 seam（提案 §6）：闭集 key + zh/en 默认串（抄自 WeebPaint src/i18n/strings.ts 2026-09-09）；
// 宿主经 configureText(t) 接管（把这些 key 并进自己的 i18n SSoT）；宿主没实现的 key 落包内默认，不许裸英文占位。
export type GalleryTextKey =
  | "gv.badge.ghost" | "gv.badge.pendingGone" | "gv.badge.dirtyBoth" | "gv.badge.newerOnCloud" | "gv.badge.conflictBoth"
  | "gv.badge.syncedBoth" | "gv.badge.cloudOnly" | "gv.badge.localOnly" | "gv.badge.localPlain" | "gv.badge.float"
  | "gv.rootDir" | "gv.time.unknown" | "gv.time.justNow" | "gv.time.minAgo" | "gv.time.hourAgo" | "gv.time.dayAgo"
  | "gv.src.both" | "gv.src.local" | "gv.src.cloud" | "gv.src.cloudStillAlive" | "name.copySuffix";
export type GalleryLang = "zh" | "en";
export const GALLERY_TEXT: Record<GalleryTextKey, Record<GalleryLang, string>> = {
  "gv.badge.ghost":        { zh: "云端副本已被移动或删除，本地有未推送的修改 —— 可「重命名留存」或「丢弃」", en: "Cloud copy was moved or deleted while local has unpushed edits — “rename & keep” or “discard”" },
  "gv.badge.pendingGone":  { zh: "云端副本已消失，本地干净副本待处理 —— 可「重新上传」推回云端，或「删除」；宽限期后自动移入回收站", en: "Cloud copy is gone; clean local copy pending — “re-upload” to push it back, or “delete”; auto-trashed after the grace period" },
  "gv.badge.dirtyBoth":    { zh: "本地+云端 · 本地有未推改动", en: "Local+cloud · unpushed local edits" },
  "gv.badge.newerOnCloud": { zh: "云端有新版本 —— 打开会自动更新到云端版", en: "A newer version exists in the cloud — opening will update to it" },
  "gv.badge.conflictBoth": { zh: "云端与本机各有新改动 —— 打开或推送时会请你裁决", en: "New changes both in the cloud and on this device — you'll be asked to resolve on open or push" },
  "gv.badge.syncedBoth":   { zh: "本地+云端（已同步）", en: "Local+cloud (synced)" },
  "gv.badge.cloudOnly":    { zh: "纯云端（未拉到本地）", en: "Cloud only (not downloaded)" },
  "gv.badge.localOnly":    { zh: "仅本地（未上传云端）", en: "Local only (not uploaded)" },
  "gv.badge.localPlain":   { zh: "本地", en: "Local" },
  "gv.badge.float":        { zh: "仅本地 · 有未上传的改动（从未同步）", en: "Local only · unsynced edits (never uploaded)" },   // 2026-09-09 补第 9 个徽章（store SyncState "float"）
  "gv.rootDir":            { zh: "/ 根目录", en: "/ Root" },
  "gv.time.unknown":       { zh: "未知", en: "Unknown" },
  "gv.time.justNow":       { zh: "刚刚", en: "Just now" },
  "gv.time.minAgo":        { zh: "{n} 分钟前", en: "{n} min ago" },
  "gv.time.hourAgo":       { zh: "{n} 小时前", en: "{n} h ago" },
  "gv.time.dayAgo":        { zh: "{n} 天前", en: "{n} d ago" },
  "gv.src.both":           { zh: "本地+云端", en: "Local+cloud" },
  "gv.src.local":          { zh: "本地", en: "Local" },
  "gv.src.cloud":          { zh: "云端", en: "Cloud" },
  "gv.src.cloudStillAlive": { zh: "{base}（云端仍在）", en: "{base} (still in cloud)" },
  "name.copySuffix":       { zh: "副本", en: "copy" },
};
export type GalleryT = (key: GalleryTextKey, params?: Record<string, string | number>) => string;
let _lang: GalleryLang = "zh";
let _host: GalleryT | null = null;
function interpolate(s: string, params?: Record<string, string | number>): string {
  return params ? s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : s;
}
/** 包内默认 t：zh/en 默认串。 */
export const defaultT: GalleryT = (key, params) => interpolate(GALLERY_TEXT[key]?.[_lang] ?? GALLERY_TEXT[key]?.zh ?? key, params);
/** 宿主接管文案（缺 key 时宿主应返回 null/undefined 以落回默认；返回空串也当缺）。 */
export function configureText(opts: { t?: (key: GalleryTextKey, params?: Record<string, string | number>) => string | null | undefined; lang?: GalleryLang }): void {
  if (opts.lang) _lang = opts.lang;
  if (opts.t) { const h = opts.t; _host = (k, p) => { const v = h(k, p); return v ? v : defaultT(k, p); }; }
}
export const t: GalleryT = (key, params) => (_host ?? defaultT)(key, params);
