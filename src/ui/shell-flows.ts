// 图库壳的 headless 流（WET 自 WeebPaint src/gallery/gallery-shell.ts，2026-09-10 包化）。
// 0.1 决定（委托下，提案 §3 回写）：壳的 **chrome 标记（按钮/弹层/底栏）留宿主**（那是 index.html 的东西，包不发明标记），
//   包只出「围着屏幕的编排」：开/关图库、IDB 占用、配额告警、全库备份、换密码。宿主用自己的元素把它们接上。
import { snapshotFolderOnce, walkLibrary, runLibraryBackup, BACKUP_BUDGET_BYTES, type WatchFolderFn } from "../core/backup/library-backup.ts";
import { runChangePassword, type ChangePasswordReport } from "../core/backup/change-password.ts";
import { humanSize } from "../core/model/gallery-view-model.ts";
import type { NameBoundary } from "../core/model/gallery-model.ts";
import { t } from "../core/text.ts";

const errMsg = (e: unknown): string => String((e as { message?: unknown })?.message || e);

// ── 开/关图库：编辑器侧的责任（存脏、等推云）经端口 ──
export interface GalleryOpenPorts {
  hasGallery(): boolean;
  applyPendingTransient?(): void;            // WeebPaint：编辑模式的挂起 transient 先落地
  isDirty(): boolean;
  saveImplicit(): Promise<void>;             // 兜底非显式保存（无地必须 no-op，宿主自守）
  awaitCloudPushIdle(): Promise<void>;
  setMode(open: boolean): void;              // body[data-mode=gallery] + 全屏容器显隐 + chrome（宿主）
  onClosed?(): void;                         // 关闭后（WeebPaint：board.requestRender + 收弹层）
  status(msg: string, isError?: boolean): void;
}
export async function openGalleryFlow(p: GalleryOpenPorts, screen: { setView(v: "files" | "trash"): void }, after?: () => void): Promise<void> {
  if (!p.hasGallery()) { p.status(t("gs.cloudDisabledNoGallery"), true); return; }
  p.applyPendingTransient?.();
  if (p.isDirty()) await p.saveImplicit();
  await p.awaitCloudPushIdle();
  p.setMode(true);
  screen.setView("files");      // 每次进默认 files 视图；setView 内含 reload
  after?.();
}
export async function closeGalleryFlow(p: GalleryOpenPorts): Promise<void> {
  p.applyPendingTransient?.();
  if (p.isDirty()) await p.saveImplicit();
  p.setMode(false);
  p.onClosed?.();
}

// ── IDB 占用（A3 2026-08-31 案：usage() 是 IDB 全表 cursor，挂死永不 settle → 8s 超时）──
const USAGE_TIMEOUT_MS = 8000;
export interface IdbUsageReport { label: string; level: "ok" | "warn" | "critical"; title?: string; }
export async function idbUsageReport(files: { usage(): Promise<{ bytes: number; count: number }> }, reportError?: (e: unknown, level: "warning") => void): Promise<IdbUsageReport | null> {
  try {
    const usageP = files.usage();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeout = new Promise<never>((_, rej) => { timer = setTimeout(() => rej(new Error(`[gallery] files.usage() timed out after ${USAGE_TIMEOUT_MS}ms (IDB not responding?)`)), USAGE_TIMEOUT_MS); });
    let res: { bytes: number; count: number };
    try { res = await Promise.race([usageP, timeout]); }
    catch (e) { usageP.catch(() => {}); if (String(e).includes("timed out")) reportError?.(e, "warning"); throw e; }
    finally { if (timer != null) clearTimeout(timer); }
    let label = t("gs.footUsage", { size: humanSize(res.bytes), count: res.count });
    let level: IdbUsageReport["level"] = "ok"; let title: string | undefined;
    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      if (est?.quota) {
        const ratio = (est.usage || 0) / est.quota, pct = Math.round(ratio * 100);
        title = t("gs.footUsageTitle", { size: humanSize(est.quota), pct });
        if (ratio > 0.95) { level = "critical"; label += t("gs.usedSuffix", { pct }); }
        else if (ratio > 0.8) { level = "warn"; label += t("gs.usedSuffix", { pct }); }
      }
    }
    return { label, level, title };
  } catch { return null; }   // null → 宿主显 gs.usageUnknown
}
/** 配额告警（只在档位变化时说一次）。返回本次是否发了告警。 */
export function createQuotaWarner(status: (msg: string, isError?: boolean) => void) {
  let last: "ok" | "warn" | "critical" = "ok";
  return async function checkQuotaAndWarn(): Promise<boolean> {
    try {
      if (typeof navigator === "undefined" || !navigator.storage?.estimate) return false;
      const est = await navigator.storage.estimate();
      if (!est?.quota) return false;
      const ratio = (est.usage || 0) / est.quota, pct = Math.round(ratio * 100);
      const level: typeof last = ratio > 0.95 ? "critical" : ratio > 0.8 ? "warn" : "ok";
      if (level === last) return false;
      last = level;
      if (level === "critical") status(t("gs.quotaCritical", { pct }), true);
      else if (level === "warn") status(t("gs.quotaWarn", { pct }), true);
      return level !== "ok";
    } catch { return false; }
  };
}

// ── 全库备份（#18；逻辑在 core/backup，这里是编排 + 文案 + 透明账）──
export interface BackupFlowPorts {
  watchFolder: WatchFolderFn;
  readFile(path: string): { getEncryptedBlob(): Promise<Blob | null>; isEncrypted(): Promise<boolean>; open(): Promise<Blob | null>; offload(): Promise<unknown> };
  isCached(syncState: string): boolean;
  pack(entries: { path: string; data: Blob }[]): Promise<Blob>;     // 宿主 codec（zip.js）
  deliver(blob: Blob, filename: string): void;                        // 宿主下载
  confirm(title: string, message: string): Promise<boolean>;
  busy<T>(label: string, fn: () => Promise<T>): Promise<T>;
  setBusyText(msg: string): void;                                     // busy 期间换文案
  status(msg: string, isError?: boolean): void;
  reportError(e: unknown, level: "warning" | "error" | "log"): void;
  appName?: string;
}
export async function runFullLibraryBackupFlow(p: BackupFlowPorts): Promise<void> {
  if (!(await p.confirm(t("bk.title"), t("bk.msg", { size: humanSize(BACKUP_BUDGET_BYTES) })))) return;
  const now = new Date();
  try {
    await p.busy(t("bk.scanning"), async () => {
      const manifest = await walkLibrary((folder) => snapshotFolderOnce(p.watchFolder, folder), { onFolder: (_f, n) => p.setBusyText(t("bk.scanningFolders", { n })) });
      if (!manifest.files.length) { p.status(t("bk.empty"), true); return; }
      const cachedBefore = new Map(manifest.files.map((fr) => [fr.path, fr.syncState != null && p.isCached(fr.syncState)]));
      const report = await runLibraryBackup(manifest.files, {
        readBytes: async (path) => {
          const f = p.readFile(path);
          let bytes: Blob | null = await f.getEncryptedBlob();
          if (!bytes) { if (await f.isEncrypted()) { const warmed = await f.open(); bytes = warmed ? await f.getEncryptedBlob() : null; } else bytes = await f.open(); }
          if (bytes && cachedBefore.get(path) === false) { try { await f.offload(); } catch (e) { p.reportError(new Error(`[library-backup] offload after read failed for ${path}: ` + String(e)), "log"); } }
          return bytes;
        },
        pack: (entries) => p.pack(entries),
        deliver: (blob, filename) => p.deliver(blob, filename),
        onProgress: (done, total) => p.setBusyText(t("bk.packing", { done: done + 1, total })),
        onError: (path, e) => p.reportError(new Error(`[library-backup] read failed for ${path}: ` + String(e)), "log"),
      }, { now, renderManifest: (r) => [
        `${p.appName ?? "gallery"} backup ${now.toISOString()}`, ``,
        `[in this zip] (${r.zipped.length})`, ...r.zipped, ``,
        `[delivered as individual downloads — over the ${humanSize(BACKUP_BUDGET_BYTES)} zip budget, nothing dropped] (${r.spilled.length})`, ...r.spilled, ``,
        `[FAILED to read — NOT in this backup] (${r.failed.length})`, ...r.failed,
      ].join("\n") });
      const good: string[] = [];
      if (report.archiveName) good.push(t("bk.done", { name: report.archiveName, n: report.zipped }));
      if (report.spilled) good.push(t("bk.spilled", { n: report.spilled }));
      const problems: string[] = [];
      if (report.failed.length) problems.push(t("bk.failedN", { n: report.failed.length }));
      if (manifest.partialFolders.length) problems.push(t("bk.partialN", { n: manifest.partialFolders.length }));
      if (manifest.truncated) problems.push(t("bk.truncated", { n: manifest.foldersVisited }));
      p.status([...good, ...problems].join(" · "), true);
      if (problems.length) p.reportError(new Error(problems.join(" · ")), "warning");
      const listSome = (names: string[]) => names.slice(0, 12).join("\n") + (names.length > 12 ? "\n" + t("bk.andMore", { n: String(names.length - 12) }) : "");
      if (report.spilledNames.length || report.failed.length) {
        const parts: string[] = [];
        if (report.spilledNames.length) parts.push(t("bk.spilledDetail", { n: String(report.spilledNames.length) }) + "\n" + listSome(report.spilledNames));
        if (report.failed.length) parts.push(t("bk.failedDetail", { n: String(report.failed.length) }) + "\n" + listSome(report.failed));
        await p.confirm(t("bk.title"), parts.join("\n\n"));
      }
    });
  } catch (e) { p.reportError(new Error(t("bk.failed", { err: errMsg(e) })), "error"); }
}

// ── 换密码（2026-09-09）：旧密码 verifier 便宜验 → 新密码两遍 → 确认 → 清点本机有字节的加密件 → 逐件 rekey（store 0.12.0，不经明文）──
export interface ChangePasswordPorts {
  hasVerifier(): boolean;
  checkVerifier(pw: string): Promise<"ok" | "bad" | "none">;
  createVerifier(pw: string): Promise<void>;
  promptPassword(o: { title: string; message: string }): Promise<string | null>;
  setPassword(pw: string): void;
  setFilePassword(name: string, pw: string): void;
  forgetFilePassword(name: string): void;
  confirm(title: string, message: string): Promise<boolean>;
  flow<T>(fn: () => Promise<T>): Promise<T>;                          // 单飞道（galleryFlow）
  busy<T>(label: string, fn: () => Promise<T>): Promise<T>;
  setBusyText(msg: string): void;
  watchFolder: WatchFolderFn;
  isCached(syncState: string): boolean;
  file(fullName: string): { isEncrypted(): Promise<boolean>; rekey(o: { newPassword: string; isOnline: () => boolean }): Promise<{ status: string }> };
  isOnline(): boolean;
  naming?: NameBoundary;
  invalidateThumb(bareName: string): Promise<void>;
  invalidateEncrypted(bareName: string): void;
  refresh(): void;
  status(msg: string, isError?: boolean): void;
  reportError(e: unknown, level: "log"): void;
}
export async function changePasswordFlow(p: ChangePasswordPorts): Promise<void> {
  const bare = p.naming?.bare ?? ((s: string) => s);
  if (!p.hasVerifier()) { p.status(t("gs.changePwNoVerifier"), true); return; }
  let oldPw: string | null = null;
  for (let attempt = 0; attempt < 3 && oldPw == null; attempt++) {
    const pw = await p.promptPassword({ title: t("gs.changePwOldTitle"), message: attempt > 0 ? t("gs.pwWrongRetry") : t("gs.changePwOldMsg") });
    if (pw == null) return;
    if ((await p.checkVerifier(pw)) === "ok") oldPw = pw;
  }
  if (oldPw == null) return;
  let newPw: string | null = null;
  for (let round = 0; round < 3 && newPw == null; round++) {
    const p1 = await p.promptPassword({ title: t("enc.setPwTitle"), message: round > 0 ? t("enc.setPwMismatch") : t("gs.changePwNewMsg") });
    if (p1 == null) return;
    const p2 = await p.promptPassword({ title: t("enc.confirmTitle"), message: t("enc.confirmMsg") });
    if (p2 == null) return;
    if (p1 === p2) newPw = p1;
  }
  if (newPw == null) return;
  if (newPw === oldPw) { p.status(t("gs.changePwSame"), true); return; }
  if (!(await p.confirm(t("gs.changePwConfirmTitle"), t("gs.changePwConfirmMsg")))) return;
  const oldP = oldPw, newP = newPw;
  await p.flow(async () => {
    let report: ChangePasswordReport = { moved: [], kept: [] }; let partial = 0;
    await p.busy(t("gs.changePwScanning"), async () => {
      const manifest = await walkLibrary((folder) => snapshotFolderOnce(p.watchFolder, folder), { onFolder: (_f, n) => p.setBusyText(t("bk.scanningFolders", { n })) });
      partial = manifest.partialFolders.length;
      const targets: string[] = [];
      for (const fr of manifest.files) {
        if (!(fr.syncState != null && p.isCached(fr.syncState))) continue;
        try { if (await p.file(fr.path).isEncrypted()) targets.push(fr.path); }
        catch (e) { p.reportError(new Error(`[change-password] isEncrypted probe failed for ${fr.path}: ` + String(e)), "log"); }
      }
      report = await runChangePassword({
        targets, oldPassword: oldP, newPassword: newP,
        rekey: (name, pw) => p.file(name).rekey({ newPassword: pw, isOnline: p.isOnline }),
        rememberFilePassword: p.setFilePassword, forgetFilePassword: p.forgetFilePassword,
        commitNewPassword: async (pw) => { await p.createVerifier(pw); p.setPassword(pw); },
        onProgress: (done, total) => p.setBusyText(t("gs.changePwBusy", { n: String(done + 1), total: String(total) })),
        onError: (name, e) => p.reportError(new Error(`[change-password] rekey failed for ${name}: ` + String(e)), "log"),
      });
      for (const n of report.moved) {
        const b = bare(n);
        try { await p.invalidateThumb(b); } catch (e) { p.reportError(new Error(`[change-password] thumb invalidate failed for ${n}: ` + String(e)), "log"); }
        p.invalidateEncrypted(b);
      }
    });
    const n = String(report.moved.length), m = String(report.kept.length), k = String(partial);
    if (report.kept.length > 0 || partial > 0) p.status(t("gs.changePwDoneKept", { n, m, k }), true);
    else p.status(t("gs.changePwDone", { n }));
    p.refresh();
  });
}
