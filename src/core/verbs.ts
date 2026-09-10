// 图库文件管理动词（无 DOM）——WET 自 WeebPaint src/gallery/gallery.ts 的 intents 段（rename/move/copy/reupload/del/
//   deleteImage/folderDelete/trashRestore/trashPurge/emptyTrash/encrypt/decrypt/unlock），2026-09-09 抽出成 headless 模块。
// 红线兜底随行（提案 §5）：删=回收站且诚实读 DelResult；改名失败保输入循环重试、错误写进重弹的输入框标题；失败不报成功；
//   移动只给「上级 + 可见子夹」绝不 poll 全树；复制加密源原样搬密文；清空回收站部分失败必说。屏幕层只负责调 + reload。
import type { GItem, TrashGItem } from "./model/gallery-view-model.ts";
import { copyTargetName, type NameBoundary } from "./model/gallery-model.ts";
import { pathFolder, pathBasename, pathJoin } from "./model/gallery-path.ts";
import { naturalCompare } from "./model/natural-order.ts";
import { t } from "./text.ts";

export interface VerbHost {
  signedIn(): boolean; online(): boolean; activeName(): string | null;
  confirm(title: string, msg: string): Promise<boolean>;
  input(title: string, def: string, opts?: { placeholder?: string }): Promise<string | null>;
  chooseFolder(title: string, msg: string, options: { label: string; value: string }[]): Promise<string | null>;
  status(msg: string, isError?: boolean): void;
  busy<T>(label: string, fn: () => Promise<T>): Promise<T>;
}
/** 编辑器侧（DocHost 的动词子集）：只管**当前打开**的那份。 */
export interface VerbDoc {
  renameActive(): Promise<string | null>;
  setName(name: string): void;
  push(item: GItem): Promise<void>;
  unload(item: GItem): Promise<void>;
  exit(): Promise<void>;
  dropCheckpoint(name: string): Promise<void> | void;
}
export interface VerbFile {
  tryMove(to: string): Promise<{ ok: true } | { ok: false; where: "local" | "cloud" }>;
  delete(): Promise<{ status: string; queuedCloudDelete?: boolean }>;
  reupload(): Promise<{ status: string }>;
  getEncryptedBlob(): Promise<Blob | null>;
  open(): Promise<Blob | null>;
  save(bytes: Blob, opts: { tryPush: boolean }): Promise<unknown>;
  encrypt(o: { isOnline: () => boolean }): Promise<{ status: string }>;
  decrypt(o: { isOnline: () => boolean }): Promise<{ status: string }>;
}
export interface VerbStore {
  file(name: string, opts: { isZip: boolean; mode: "new" | "existing" }): VerbFile;
  files: {
    nameOccupied(name: string): Promise<unknown>;
    deleteFolder(path: string): Promise<unknown>;
    restoreTrash(o: { trashKey: string | null; fromCloud: boolean; cloudRef: string | null; targetName: string; encrypted: boolean }): Promise<{ name?: string }>;
    purgeTrash(o: { trashKey: string | null; cloudRef: string | null }): Promise<unknown>;
    emptyTrash(o: { scope: "local" | "cloud" | "both" }): Promise<{ failed?: { where?: string }[] }>;
  };
}
export interface VerbEncryption {
  ensureUnlocked(name: string): Promise<boolean>;
  ensureNewPassword(): Promise<string | null>;
  isFreshPasswordSetup(): boolean;
  rollbackFreshPassword(): void;
  setPassword(pw: string): void;
}
export interface VerbDeps {
  store: () => VerbStore;
  host: VerbHost;
  doc: VerbDoc;
  naming?: NameBoundary;
  /** 这份文档在 store 里是不是 zip 容器（WeebPaint .ora 恒 true；WXHW .txt false / .webxiaoheiwu.zip true）。 */
  isZipDoc?: (fullName: string) => boolean;
  thumbs?: { invalidate(name: string): Promise<void> | void };
  onEncryptionChanged?: (name: string) => void;
  encryption?: VerbEncryption;
}
const IDENTITY: NameBoundary = { bare: (s) => s, full: (b) => b };
const errMsg = (e: unknown) => String((e as { message?: unknown })?.message || e);

export function createGalleryVerbs(d: VerbDeps) {
  const naming = d.naming ?? IDENTITY;
  const isZipDoc = d.isZipDoc ?? (() => true);
  const docFile = (bare: string, mode: "new" | "existing" = "existing") => { const full = naming.full(bare); return d.store().file(full, { isZip: isZipDoc(full), mode }); };
  const whereLabel = (where: "local" | "cloud") => (where === "local" ? t("gal.loc.local") : t("gal.loc.cloud"));
  const cloudOn = () => d.host.signedIn() && d.host.online();

  async function rename(item: GItem): Promise<void> {
    if (item.name === d.host.activeName()) {
      const nn = await d.doc.renameActive();
      if (nn && nn !== item.name) d.host.status(t("gal.st.renamed2", { from: item.name, to: nn }));
      return;
    }
    // v267：重名/失败要 surface——错误写进重弹的输入框标题并循环重试，输入不丢。
    let candidate = item.name, note = "";
    while (true) {
      const input = await d.host.input(note ? t("gal.dlg.renameNote", { note }) : t("gal.dlg.rename"), candidate, { placeholder: t("gal.ph.newName") });
      if (input == null) { d.host.status(t("gal.st.cancelled")); return; }
      const trimmed = input.trim();
      if (!trimmed) { candidate = ""; note = t("gal.note.empty"); continue; }
      if (trimmed === item.name) { d.host.status(t("gal.st.nameUnchanged")); return; }
      const result = await d.host.busy<{ taken?: string; ok?: boolean; error?: unknown }>(t("gal.busy.rename", { name: item.name, to: trimmed }), async () => {
        try {
          const r = await docFile(item.name).tryMove(naming.full(trimmed));   // 占用检查内化在 store.tryMove，不动字节直接返错
          if (!r.ok) return { taken: whereLabel(r.where) };
          d.host.status(t("gal.st.renamed", { to: trimmed }));
          return { ok: true };
        } catch (e: unknown) { return { error: errMsg(e) }; }
      });
      if (result.taken) { candidate = trimmed; note = t("gal.note.taken", { loc: result.taken }); continue; }
      if (result.error) { candidate = trimmed; note = t("gal.note.fail", { e: String(result.error) }); continue; }
      return;
    }
  }

  /** 移动目标只有「上级 + 当前可见子夹」——用手上的单夹数据，绝不 poll 全树。 */
  function moveTargets(item: GItem, ctx: { folder: string; folderNames: string[] }): string[] {
    const cur = pathFolder(item.name);
    const targets: string[] = [];
    if (ctx.folder) targets.push(pathFolder(ctx.folder));
    for (const fn of ctx.folderNames) targets.push(pathJoin(ctx.folder, fn));
    return [...new Set(targets)].filter((f) => f !== cur).sort((a, b) => (a === "" ? -1 : b === "" ? 1 : naturalCompare(a, b)));
  }
  async function move(item: GItem, ctx: { folder: string; folderNames: string[] }): Promise<void> {
    const base = pathBasename(item.name);
    const sorted = moveTargets(item, ctx);
    if (!sorted.length) { d.host.status(t("gal.st.noOtherFolder")); return; }
    const target = await d.host.chooseFolder(t("gal.dlg.moveTitle", { base }), t("gal.dlg.moveMsg"), sorted.map((f) => ({ label: f === "" ? t("gal.rootFolder") : f, value: f })));
    if (target == null) return;
    const newName = pathJoin(target, base);
    if (newName === item.name) { d.host.status(t("gal.st.alreadyInFolder")); return; }
    await d.host.busy(t("gal.busy.move", { base, target: target || t("gal.root") }), async () => {
      try {
        const r = await docFile(item.name).tryMove(naming.full(newName));
        if (!r.ok) { d.host.status(t("gal.st.nameTakenTarget", { loc: whereLabel(r.where), base }), true); return; }
        if (item.name === d.host.activeName()) d.doc.setName(newName);
        d.host.status(t("gal.st.moved", { target: target || t("gal.root") }));
      } catch (e: unknown) { d.host.status(t("gal.st.moveFail", { e: errMsg(e) }), true); }
    });
  }

  /** 复制：加密源原样搬密文（不解壳不问密码；明文派生物不落持久层），明文源 open()；目标名 = 同夹「<名> 副本」按当前夹快照去重。 */
  async function copy(item: GItem, currentNames: readonly string[]): Promise<void> {
    await d.host.busy(t("gal.busy.copy", { base: pathBasename(item.name) }), async () => {
      try {
        const src = docFile(item.name);
        const bytes: Blob | null = (await src.getEncryptedBlob()) ?? (await src.open());
        if (!bytes) { d.host.status(t("gal.st.copyNoBytes"), true); return; }
        const taken = new Set(currentNames);
        const newName = copyTargetName(item.name, (n) => taken.has(n));
        await docFile(newName, "new").save(bytes, { tryPush: cloudOn() });
        d.host.status(t("gal.st.copied", { name: pathBasename(newName) }));
      } catch (e: unknown) { d.host.status(t("gal.st.copyFail", { e: errMsg(e) }), true); }
    });
  }

  async function push(item: GItem): Promise<void> { await d.doc.push(item); }
  async function unload(item: GItem): Promise<void> { await d.doc.unload(item); }

  async function reupload(item: GItem): Promise<void> {
    await d.host.busy(t("gal.busy.reupload"), async () => {
      try {
        const r = await docFile(item.name).reupload();
        if (r.status === "no-local") { d.host.status(t("gal.st.reuploadFail", { e: "no-local" }), true); return; }
        d.host.status(t("gal.st.reuploaded", { name: item.name }));
      } catch (e: unknown) {
        const msg = errMsg(e);
        if ((e as { name?: string })?.name === "CloudNameCollisionError" || /collision|已存在|exists/i.test(msg)) d.host.status(t("gal.st.reuploadConflict", { name: item.name }), true);
        else d.host.status(t("gal.st.reuploadFail", { e: msg }), true);
      }
    });
  }

  /** 删除 = 移回收站；诚实读 DelResult（cancelled / noop / 只删了本地 都不许报「已删除」）。 */
  async function del(item: GItem): Promise<void> {
    const isActive = item.name === d.host.activeName();
    const isLocal = !!item.local, isCloud = !!item.cloud;
    const dirty = isLocal && isCloud && !!item.dirty;
    let detail = isLocal && isCloud ? (dirty ? t("gal.del.dirtyDetail") : t("gal.del.syncedDetail")) : isCloud ? t("gal.del.cloudDetail") : t("gal.del.localDetail");
    if (isActive) detail += t("gal.del.activeSuffix");
    if (!(await d.host.confirm(t("gal.dlg.delTitle", { name: item.name }), detail))) return;
    await d.host.busy(t("gal.busy.del", { name: item.name }), async () => {
      try {
        const del = await docFile(item.name).delete();
        if (del.status === "cancelled") { d.host.status(t("gal.st.delCancelled", { name: item.name })); return; }
        void d.doc.dropCheckpoint(item.name);
        if (isActive) await d.doc.exit();
        d.host.status(del.status === "noop" ? t("gal.st.delNothing", { name: item.name })
          : del.queuedCloudDelete === false ? t("gal.st.delLocalOnly", { name: item.name })
          : t("gal.st.deleted", { name: item.name }), del.status === "noop" || del.queuedCloudDelete === false);
      } catch (e: unknown) { d.host.status(t("gal.st.delFail", { e: errMsg(e) }), true); }
    });
  }
  async function deleteImage(img: { path: string; name: string }): Promise<void> {
    if (!(await d.host.confirm(t("gal.dlg.delTitle", { name: img.name }), t("gal.del.imageDetail")))) return;
    await d.host.busy(t("gal.busy.del", { name: img.name }), async () => {
      try {
        const del = await d.store().file(img.path, { isZip: false, mode: "existing" }).delete();
        if (del.status === "cancelled") { d.host.status(t("gal.st.delCancelled", { name: img.name })); return; }
        d.host.status(del.status === "noop" ? t("gal.st.delNothing", { name: img.name })
          : del.queuedCloudDelete === false ? t("gal.st.delLocalOnly", { name: img.name })
          : t("gal.st.deleted", { name: img.name }), del.status === "noop" || del.queuedCloudDelete === false);
      } catch (e: unknown) { d.host.status(t("gal.st.delFail", { e: errMsg(e) }), true); }
    });
  }
  async function folderDelete(ft: { name: string; path: string }): Promise<void> {
    try { await d.store().files.deleteFolder(ft.path); d.host.status(t("gal.st.folderDeleted", { name: ft.name })); }
    catch (e: unknown) { d.host.status(t("gal.st.folderDelFail", { e: errMsg(e) }), true); }
  }

  async function trashRestore(item: TrashGItem): Promise<void> {
    await d.host.busy(t("gal.busy.restore", { name: item.name }), async () => {
      try {
        const res = await d.store().files.restoreTrash({
          trashKey: item.local ? item.local.trashKey! : null, fromCloud: !!item.cloud, cloudRef: item.cloud ? item.cloud.id! : null,
          targetName: naming.full(item.name), encrypted: !!item.encrypted,
        });
        const rn = res.name ? naming.bare(res.name) : item.name;
        d.host.status(rn !== item.name ? t("gal.st.restoredRenamed", { name: rn, orig: item.name }) : t("gal.st.restored", { name: rn }));
      } catch (e: unknown) { d.host.status(t("gal.st.restoreFail", { e: errMsg(e) }), true); }
    });
  }
  async function trashPurge(item: TrashGItem): Promise<void> {
    if (!(await d.host.confirm(t("gal.dlg.purgeTitle", { name: item.name }), t("gal.dlg.purgeMsg")))) return;
    await d.host.busy(t("gal.busy.purge", { name: item.name }), async () => {
      try { await d.store().files.purgeTrash({ trashKey: item.local ? item.local.trashKey! : null, cloudRef: item.cloud ? item.cloud.id! : null }); d.host.status(t("gal.st.purged", { name: item.name })); }
      catch (e: unknown) { d.host.status(t("gal.st.purgeFail", { e: errMsg(e) }), true); }
    });
  }
  async function emptyTrash(scope: "local" | "cloud" | "both" = "both"): Promise<void> {
    const label = scope === "local" ? t("gal.scope.local") : scope === "cloud" ? t("gal.scope.cloud") : t("gal.scope.both");
    if (scope === "cloud" && !cloudOn()) { d.host.status(t("gal.st.emptyTrashCloudNeedLogin"), true); return; }
    if (!(await d.host.confirm(t("gal.dlg.emptyTrashTitle", { label }), t("gal.dlg.emptyTrashMsg", { label })))) return;
    await d.host.busy(t("gal.busy.emptyTrash", { label }), async () => {
      const res = await d.store().files.emptyTrash({ scope });
      const cloudFails = (res.failed || []).filter((f) => f.where !== "local").length;
      if (scope !== "local" && cloudFails) d.host.status(t("gal.st.emptyTrashCloudFail", { n: cloudFails }), true);
      else if ((res.failed || []).length) d.host.status(t("gal.st.emptyTrashPartial"), true);
      else d.host.status(t("gal.st.emptyTrashDone", { label }));
    });
  }

  // ── 加密 intent（ADR-0012）：transform 与密码循环在 store；这里只剩活动项预检、首次设密码 UX、残留清理 ──
  function _encPrecheck(item: GItem, verb: string): boolean {
    if (item.name === d.host.activeName()) { d.host.status(t("gal.st.openActive", { verb }), true); return false; }
    if (!item.local) { d.host.status(t("gal.st.cloudPullFirst", { verb }), true); return false; }
    return true;
  }
  async function _afterSwap(item: GItem, res: { status?: string }, okMsg: string): Promise<boolean> {
    if (res.status === "offline") { d.host.status(t("gal.st.encNeedOnline"), true); return false; }
    if (res.status === "no-local") { d.host.status(t("gal.st.noLocalBytes"), true); return false; }
    if (res.status === "locked") { d.host.status(t("gal.st.cancelledPw"), true); return false; }
    if (res.status === "conflict") d.host.status(t("gal.st.encConflict", { name: item.name }), true);
    else if (res.status === "cloud-deferred") d.host.status(t("gal.st.encDeferred", { okMsg }), true);
    else d.host.status(okMsg);
    await d.thumbs?.invalidate(item.name);
    d.onEncryptionChanged?.(item.name);
    return true;
  }
  async function encryptItem(item: GItem): Promise<void> {
    const enc = d.encryption; if (!enc) return;
    if (!_encPrecheck(item, t("gal.verb.encrypt"))) return;
    const fresh = enc.isFreshPasswordSetup();
    const pw = await enc.ensureNewPassword();
    if (pw == null) { d.host.status(t("gal.st.cancelled")); return; }
    enc.setPassword(pw);
    let ok = false;
    try {
      const res = await docFile(item.name).encrypt({ isOnline: cloudOn });
      if (res.status === "already") { d.host.status(t("gal.st.alreadyEnc")); return; }
      if (!(await _afterSwap(item, res, t("gal.st.encryptedOk", { name: item.name })))) return;
      ok = true;
    } catch (e: unknown) { d.host.status(t("gal.st.encFail", { e: errMsg(e) }), true); }
    finally { if (fresh && !ok) enc.rollbackFreshPassword(); }   // ③ 2026-09-09 加密合规审计：首次创建的密码只有加密成功才算数
  }
  async function decryptItem(item: GItem): Promise<void> {
    const enc = d.encryption; if (!enc) return;
    if (!_encPrecheck(item, t("gal.verb.decrypt"))) return;
    if (!(await d.host.confirm(t("gal.dlg.decryptTitle", { base: pathBasename(item.name) }), t("gal.dlg.decryptMsg")))) return;
    if (!(await enc.ensureUnlocked(item.name))) { d.host.status(t("gal.st.cancelledPw"), true); return; }   // 解锁在 busy 之前
    try {
      const res = await docFile(item.name).decrypt({ isOnline: cloudOn });
      if (res.status === "not-encrypted") { d.host.status(t("gal.st.notEnc")); return; }
      await _afterSwap(item, res, t("gal.st.decrypted", { name: item.name }));
    } catch (e: unknown) { d.host.status(t("gal.st.decryptFail", { e: errMsg(e) }), true); }
  }
  async function unlock(name: string): Promise<boolean> {
    const ok = !!(await d.encryption?.ensureUnlocked(name));
    if (ok) d.host.status(t("gal.st.unlocked"));
    return ok;
  }

  return { rename, move, moveTargets, copy, push, unload, reupload, del, deleteImage, folderDelete, trashRestore, trashPurge, emptyTrash, encryptItem, decryptItem, unlock, whereLabel };
}
export type GalleryVerbs = ReturnType<typeof createGalleryVerbs>;
