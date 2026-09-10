// 命名小工具（抄自 WeebPaint src/naming.ts 2026-08-26 器官；纯，now 可注入）。
const p2 = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}`;
/** 默认新建名 = yyyymmdd-hex4（家族惯例；两家 policy.defaultNewName 的默认实现）。禁「未命名」。 */
export function galleryDefaultName(now: Date = new Date()): string {
  const rand = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0");
  return `${ymd(now)}-${rand}`;
}
/** 下载版本时间戳 = YYYYMMDD-HHMM。 */
export function downloadStamp(now: Date = new Date()): string { return `${ymd(now)}-${p2(now.getHours())}${p2(now.getMinutes())}`; }
