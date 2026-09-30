// 图库文件管理动词（无 DOM）——WET 自 WeebPaint src/gallery/gallery.ts 的 intents 段（rename/move/copy/reupload/del/
//   deleteImage/folderDelete/asideRestore/asidePurge/emptyAside/encrypt/decrypt/unlock），2026-09-09 抽出成 headless 模块。
// 红线兜底随行（提案 §5）：删=回收站且诚实读 DelResult；改名失败保输入循环重试、错误写进重弹的输入框标题；失败不报成功；
//   移动只给「上级 + 可见子夹」绝不 poll 全树；复制加密源原样搬密文；清空回收站部分失败必说。屏幕层只负责调 + reload。
import { hasLocalCopy, hasCloudCopy, hasUnpushed, type GItem } from "./model/gallery-view-model.ts";
import { ASIDE, type AsideItem, type AsideKind, type AsideScope, type AsideEmptyResult } from "./model/aside.ts";
import { copyTargetName } from "./model/gallery-model.ts";
import { pathFolder, pathJoin } from "./model/gallery-path.ts";
import type { Identifiers } from "@internal/store";
import { naturalCompare } from "./model/natural-order.ts";
import { t } from "./text.ts";

export interface VerbHost {
  signedIn(): boolean; online(): boolean;
  /** 当前打开的文档的身份（0.6.0 起叫 activeIdentifier，原 activeName）。 */
  activeIdentifier(): string | null;
  confirm(title: string, msg: string): Promise<boolean>;
  input(title: string, def: string, opts?: { placeholder?: string }): Promise<string | null>;
  chooseFolder(title: string, msg: string, options: { label: string; value: string }[]): Promise<string | null>;
  status(msg: string, isError?: boolean): void;
  busy<T>(label: string, fn: () => Promise<T>): Promise<T>;
}
/** 编辑器侧（DocHost 的动词子集）：只管**当前打开**的那份。 */
export interface VerbDoc {
  /** 改当前打开的那份的名字（编辑器自己的改名 UI）；返回新身份，没改 → null。 */
  renameActive(): Promise<string | null>;
  /** 当前打开的那份被图库挪了文件夹 → 告诉编辑器新身份（0.6.0 起叫 setIdentifier，原 setName）。 */
  setIdentifier(identifier: string): void;
  push(item: GItem): Promise<void>;
  unload(item: GItem): Promise<void>;
  exit(): Promise<void>;
  dropCheckpoint(identifier: string): Promise<void> | void;
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
  /** 0.3.0：留一份离线副本（store RawFile 0.13.0 已有同名面）。 */
  keepOffline(opts?: { onProgress?: (done: number, total: number) => void }): Promise<void>;
}
export interface VerbStore {
  identifiers: Identifiers;
  file(identifier: string, opts: { mode: "new" | "existing" }): VerbFile;
  files: {
    occupied(identifier: string): Promise<unknown>;
    deleteFolder(path: string): Promise<unknown>;
    restoreTrash(o: { trashKey: string | null; fromCloud: boolean; cloudRef: string | null; targetName: string; encrypted: boolean }): Promise<{ name?: string }>;
    purgeTrash(o: { trashKey: string | null; cloudRef: string | null }): Promise<unknown>;
    emptyTrash(o: { scope: AsideScope }): Promise<AsideEmptyResult>;
    emptyBackup(o: { scope: AsideScope }): Promise<AsideEmptyResult>;
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
  // （0.6.0：naming / isZipDoc 退役——身份怎么切、是不是 zip 容器都是 store.identifiers 的事；动词只需要 RawFile 面，不用 zip()。）
  thumbs?: { invalidate(identifier: string): Promise<void> | void };
  onEncryptionChanged?: (identifier: string) => void;
  encryption?: VerbEncryption;
  // （0.3.1 的 onRenamed hook 0.3.2 撤：改名是身份变更、事件源在 store（`store.files.onRenamed`，0.14.0）；图库只是发起改名的前端——user 2026-09-19「gallery 是前端」。）
}
const errMsg = (e: unknown) => String((e as { message?: unknown })?.message || e);

export function createGalleryVerbs(d: VerbDeps) {
  const docFile = (identifier: string, mode: "new" | "existing" = "existing") => d.store().file(identifier, { mode });
  const ids = () => d.store().identifiers;
  const whereLabel = (where: "local" | "cloud") => (where === "local" ? t("gal.loc.local") : t("gal.loc.cloud"));
  /** 文案里给人看的名字：文档 = 主干；不是文档 = 最后一段。 */
  const stemOf = (identifier: string): string => ids().parse(identifier)?.stem ?? identifier.slice(identifier.lastIndexOf("/") + 1);
  const cloudOn = () => d.host.signedIn() && d.host.online();

  async function rename(item: GItem): Promise<void> {
    if (item.identifier === d.host.activeIdentifier()) {
      const nn = await d.doc.renameActive();
      if (nn && nn !== item.identifier) d.host.status(t("gal.st.renamed2", { from: item.stem, to: stemOf(nn) }));
      return;
    }
    // v267：重名/失败要 surface——错误写进重弹的输入框标题并循环重试，输入不丢。
    // 0.4.1（2026-09-26，WXHW user「重命名的时候不应该包含扩展名(.webxiaoheiwu.zip)」→「修」）：改名**只编辑主干**，后缀不动。
    //   0.6.0：主干 / 后缀直接从 store.identifiers 切（不再从显示名倒推）。用户自己把后缀打进去了就不重复补。
    const d0 = ids().parse(item.identifier);
    const suffix = d0?.suffix ?? "", folder = d0?.folder ?? pathFolder(item.identifier);
    const withSuffix = (typed: string): string => (suffix && typed.toLowerCase().endsWith(suffix.toLowerCase()) ? typed.slice(0, typed.length - suffix.length) : typed);
    let candidate = item.stem, note = "";
    while (true) {
      const input = await d.host.input(note ? t("gal.dlg.renameNote", { note }) : t("gal.dlg.rename"), candidate, { placeholder: t("gal.ph.newName") });
      if (input == null) { d.host.status(t("gal.st.cancelled")); return; }
      const trimmed = input.trim();
      if (!trimmed) { candidate = ""; note = t("gal.note.empty"); continue; }
      const shownTarget = withSuffix(trimmed);
      const target = ids().join({ folder, stem: shownTarget, suffix });
      if (target === item.identifier) { d.host.status(t("gal.st.nameUnchanged")); return; }
      const result = await d.host.busy<{ taken?: string; ok?: boolean; error?: unknown }>(t("gal.busy.rename", { name: item.stem, to: shownTarget }), async () => {
        try {
          const r = await docFile(item.identifier).tryMove(target);   // 占用检查内化在 store.tryMove，不动字节直接返错
          if (!r.ok) return { taken: whereLabel(r.where) };
          d.host.status(t("gal.st.renamed", { to: shownTarget }));
          return { ok: true };
        } catch (e: unknown) { return { error: errMsg(e) }; }
      });
      if (result.taken) { candidate = shownTarget; note = t("gal.note.taken", { loc: result.taken }); continue; }
      if (result.error) { candidate = shownTarget; note = t("gal.note.fail", { e: String(result.error) }); continue; }
      return;
    }
  }

  /** 移动目标只有「上级 + 当前可见子夹」——用手上的单夹数据，绝不 poll 全树。 */
  function moveTargets(item: GItem, ctx: { folder: string; folderNames: string[] }): string[] {
    const cur = pathFolder(item.identifier);
    const targets: string[] = [];
    if (ctx.folder) targets.push(pathFolder(ctx.folder));
    for (const fn of ctx.folderNames) targets.push(pathJoin(ctx.folder, fn));
    return [...new Set(targets)].filter((f) => f !== cur).sort((a, b) => (a === "" ? -1 : b === "" ? 1 : naturalCompare(a, b)));
  }
  async function move(item: GItem, ctx: { folder: string; folderNames: string[] }): Promise<void> {
    const base = item.stem;
    const sorted = moveTargets(item, ctx);
    if (!sorted.length) { d.host.status(t("gal.st.noOtherFolder")); return; }
    const target = await d.host.chooseFolder(t("gal.dlg.moveTitle", { base }), t("gal.dlg.moveMsg"), sorted.map((f) => ({ label: f === "" ? t("gal.rootFolder") : f, value: f })));
    if (target == null) return;
    const d0 = ids().parse(item.identifier);
    const newIdentifier = d0 ? ids().join({ folder: target, stem: d0.stem, suffix: d0.suffix }) : pathJoin(target, item.identifier.slice(item.identifier.lastIndexOf("/") + 1));
    if (newIdentifier === item.identifier) { d.host.status(t("gal.st.alreadyInFolder")); return; }
    await d.host.busy(t("gal.busy.move", { base, target: target || t("gal.root") }), async () => {
      try {
        const r = await docFile(item.identifier).tryMove(newIdentifier);
        if (!r.ok) { d.host.status(t("gal.st.nameTakenTarget", { loc: whereLabel(r.where), base }), true); return; }
        if (item.identifier === d.host.activeIdentifier()) d.doc.setIdentifier(newIdentifier);
        d.host.status(t("gal.st.moved", { target: target || t("gal.root") }));
      } catch (e: unknown) { d.host.status(t("gal.st.moveFail", { e: errMsg(e) }), true); }
    });
  }

  /** 复制：加密源原样搬密文（不解壳不问密码；明文派生物不落持久层），明文源 open()；目标 = 同夹「<主干> 副本」按当前夹快照去重，后缀不动。 */
  async function copy(item: GItem, currentIdentifiers: readonly string[]): Promise<void> {
    await d.host.busy(t("gal.busy.copy", { base: item.stem }), async () => {
      try {
        const src = docFile(item.identifier);
        const bytes: Blob | null = (await src.getEncryptedBlob()) ?? (await src.open());
        if (!bytes) { d.host.status(t("gal.st.copyNoBytes"), true); return; }
        const taken = new Set(currentIdentifiers);
        const newIdentifier = copyTargetName(item.identifier, (n) => taken.has(n), ids());
        await docFile(newIdentifier, "new").save(bytes, { tryPush: cloudOn() });
        d.host.status(t("gal.st.copied", { name: stemOf(newIdentifier) }));
      } catch (e: unknown) { d.host.status(t("gal.st.copyFail", { e: errMsg(e) }), true); }
    });
  }

  async function push(item: GItem): Promise<void> { await d.doc.push(item); }
  async function unload(item: GItem): Promise<void> { await d.doc.unload(item); }
  /** 0.3.0（JRB）：纯云端件「留一份离线」——不打开文档，只囤字节（读者在 wifi 下把一晚要读的先囤好）。与 pullLocal（= 打开即缓存）分工。失败走 status 不抛。 */
  async function keepOffline(item: GItem): Promise<void> {
    await d.host.busy(t("gal.busy.keepOffline", { name: item.stem }), async () => {
      try { await docFile(item.identifier).keepOffline(); d.host.status(t("gal.st.keptOffline", { name: item.stem })); }
      catch (e: unknown) { d.host.status(t("gal.st.keepOfflineFail", { e: errMsg(e) }), true); }
    });
  }

  async function reupload(item: GItem): Promise<void> {
    await d.host.busy(t("gal.busy.reupload"), async () => {
      try {
        const r = await docFile(item.identifier).reupload();
        if (r.status === "no-local") { d.host.status(t("gal.st.reuploadFail", { e: "no-local" }), true); return; }
        d.host.status(t("gal.st.reuploaded", { name: item.stem }));
      } catch (e: unknown) {
        const msg = errMsg(e);
        if ((e as { name?: string })?.name === "CloudNameCollisionError" || /collision|已存在|exists/i.test(msg)) d.host.status(t("gal.st.reuploadConflict", { name: item.stem }), true);
        else d.host.status(t("gal.st.reuploadFail", { e: msg }), true);
      }
    });
  }

  /** 删除 = 移回收站；诚实读 DelResult（cancelled / noop / 只删了本地 都不许报「已删除」）。 */
  async function del(item: GItem): Promise<void> {
    const isActive = item.identifier === d.host.activeIdentifier();
    const isLocal = hasLocalCopy(item.syncState), isCloud = hasCloudCopy(item.syncState);
    const dirty = isLocal && isCloud && hasUnpushed(item.syncState);
    let detail = isLocal && isCloud ? (dirty ? t("gal.del.dirtyDetail") : t("gal.del.syncedDetail")) : isCloud ? t("gal.del.cloudDetail") : t("gal.del.localDetail");
    if (isActive) detail += t("gal.del.activeSuffix");
    if (!(await d.host.confirm(t("gal.dlg.delTitle", { name: item.stem }), detail))) return;
    await d.host.busy(t("gal.busy.del", { name: item.stem }), async () => {
      try {
        const del = await docFile(item.identifier).delete();
        if (del.status === "cancelled") { d.host.status(t("gal.st.delCancelled", { name: item.stem })); return; }
        void d.doc.dropCheckpoint(item.identifier);
        if (isActive) await d.doc.exit();
        d.host.status(del.status === "noop" ? t("gal.st.delNothing", { name: item.stem })
          : del.queuedCloudDelete === false ? t("gal.st.delLocalOnly", { name: item.stem })
          : t("gal.st.deleted", { name: item.stem }), del.status === "noop" || del.queuedCloudDelete === false);
      } catch (e: unknown) { d.host.status(t("gal.st.delFail", { e: errMsg(e) }), true); }
    });
  }
  async function deleteImage(img: { identifier: string; label: string }): Promise<void> {
    if (!(await d.host.confirm(t("gal.dlg.delTitle", { name: img.label }), t("gal.del.imageDetail")))) return;
    await d.host.busy(t("gal.busy.del", { name: img.label }), async () => {
      try {
        const del = await d.store().file(img.identifier, { mode: "existing" }).delete();
        if (del.status === "cancelled") { d.host.status(t("gal.st.delCancelled", { name: img.label })); return; }
        d.host.status(del.status === "noop" ? t("gal.st.delNothing", { name: img.label })
          : del.queuedCloudDelete === false ? t("gal.st.delLocalOnly", { name: img.label })
          : t("gal.st.deleted", { name: img.label }), del.status === "noop" || del.queuedCloudDelete === false);
      } catch (e: unknown) { d.host.status(t("gal.st.delFail", { e: errMsg(e) }), true); }
    });
  }
  async function folderDelete(ft: { name: string; path: string }): Promise<void> {
    try { await d.store().files.deleteFolder(ft.path); d.host.status(t("gal.st.folderDeleted", { name: ft.name })); }
    catch (e: unknown) { d.host.status(t("gal.st.folderDelFail", { e: errMsg(e) }), true); }
  }

  // ── 搁置区（回收站 / 备份箱，0.5.0）：恢复 / 彻底删只认 item 自带的两把钥匙（localKey / cloudRef），
  //    store 的 restoreTrash / purgeTrash 两个分区都认；清空调哪个、说什么话走 ASIDE 表。 ──
  async function asideRestore(item: AsideItem): Promise<void> {
    await d.host.busy(t("gal.busy.restore", { name: item.stem }), async () => {
      try {
        const res = await d.store().files.restoreTrash({
          trashKey: item.localKey, fromCloud: !!item.cloudRef, cloudRef: item.cloudRef,
          targetName: item.identifier, encrypted: item.encrypted,
        });
        const rn = res.name ?? item.identifier;
        d.host.status(rn !== item.identifier ? t("gal.st.restoredRenamed", { name: stemOf(rn), orig: item.stem }) : t("gal.st.restored", { name: item.stem }));
      } catch (e: unknown) { d.host.status(t("gal.st.restoreFail", { e: errMsg(e) }), true); }
    });
  }
  async function asidePurge(item: AsideItem): Promise<void> {
    if (!(await d.host.confirm(t("gal.dlg.purgeTitle", { name: item.stem }), t("gal.dlg.purgeMsg")))) return;
    await d.host.busy(t("gal.busy.purge", { name: item.stem }), async () => {
      try { await d.store().files.purgeTrash({ trashKey: item.localKey, cloudRef: item.cloudRef }); d.host.status(t("gal.st.purged", { name: item.stem })); }
      catch (e: unknown) { d.host.status(t("gal.st.purgeFail", { e: errMsg(e) }), true); }
    });
  }
  async function emptyAside(kind: AsideKind, scope: AsideScope = "both"): Promise<void> {
    const spec = ASIDE[kind], tx = spec.text;
    const label = scope === "local" ? t("gal.scope.local") : scope === "cloud" ? t("gal.scope.cloud") : t("gal.scope.both");
    if (scope === "cloud" && !cloudOn()) { d.host.status(t(tx.emptyNeedLogin), true); return; }
    if (!(await d.host.confirm(t(tx.emptyTitle, { label }), t(tx.emptyMsg, { label })))) return;
    await d.host.busy(t(tx.emptyBusy, { label }), async () => {
      try {
        const res = await spec.empty(d.store().files, scope);
        const cloudFails = (res.failed || []).filter((f) => f.where !== "local").length;
        if (scope !== "local" && cloudFails) d.host.status(t(tx.emptyCloudFail, { n: cloudFails }), true);
        else if ((res.failed || []).length) d.host.status(t(tx.emptyPartial), true);
        else d.host.status(t(tx.emptyDone, { label }));
      } catch (e: unknown) { d.host.status(`${t(tx.emptyPartial)}: ${errMsg(e)}`, true); }
    });
  }

  // ── 加密 intent（ADR-0012）：transform 与密码循环在 store；这里只剩活动项预检、首次设密码 UX、残留清理 ──
  function _encPrecheck(item: GItem, verb: string): boolean {
    if (item.identifier === d.host.activeIdentifier()) { d.host.status(t("gal.st.openActive", { verb }), true); return false; }
    if (!hasLocalCopy(item.syncState)) { d.host.status(t("gal.st.cloudPullFirst", { verb }), true); return false; }
    return true;
  }
  async function _afterSwap(item: GItem, res: { status?: string }, okMsg: string): Promise<boolean> {
    if (res.status === "offline") { d.host.status(t("gal.st.encNeedOnline"), true); return false; }
    if (res.status === "no-local") { d.host.status(t("gal.st.noLocalBytes"), true); return false; }
    if (res.status === "locked") { d.host.status(t("gal.st.cancelledPw"), true); return false; }
    if (res.status === "conflict") d.host.status(t("gal.st.encConflict", { name: item.stem }), true);
    else if (res.status === "cloud-deferred") d.host.status(t("gal.st.encDeferred", { okMsg }), true);
    else d.host.status(okMsg);
    await d.thumbs?.invalidate(item.identifier);
    d.onEncryptionChanged?.(item.identifier);
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
      const res = await docFile(item.identifier).encrypt({ isOnline: cloudOn });
      if (res.status === "already") { d.host.status(t("gal.st.alreadyEnc")); return; }
      if (!(await _afterSwap(item, res, t("gal.st.encryptedOk", { name: item.stem })))) return;
      ok = true;
    } catch (e: unknown) { d.host.status(t("gal.st.encFail", { e: errMsg(e) }), true); }
    finally { if (fresh && !ok) enc.rollbackFreshPassword(); }   // ③ 2026-09-09 加密合规审计：首次创建的密码只有加密成功才算数
  }
  async function decryptItem(item: GItem): Promise<void> {
    const enc = d.encryption; if (!enc) return;
    if (!_encPrecheck(item, t("gal.verb.decrypt"))) return;
    if (!(await d.host.confirm(t("gal.dlg.decryptTitle", { base: item.stem }), t("gal.dlg.decryptMsg")))) return;
    if (!(await enc.ensureUnlocked(item.identifier))) { d.host.status(t("gal.st.cancelledPw"), true); return; }   // 解锁在 busy 之前
    try {
      const res = await docFile(item.identifier).decrypt({ isOnline: cloudOn });
      if (res.status === "not-encrypted") { d.host.status(t("gal.st.notEnc")); return; }
      await _afterSwap(item, res, t("gal.st.decrypted", { name: item.stem }));
    } catch (e: unknown) { d.host.status(t("gal.st.decryptFail", { e: errMsg(e) }), true); }
  }
  async function unlock(name: string): Promise<boolean> {
    const ok = !!(await d.encryption?.ensureUnlocked(name));
    if (ok) d.host.status(t("gal.st.unlocked"));
    return ok;
  }

  return { rename, move, moveTargets, copy, push, unload, keepOffline, reupload, del, deleteImage, folderDelete, asideRestore, asidePurge, emptyAside, encryptItem, decryptItem, unlock, whereLabel };
}
export type GalleryVerbs = ReturnType<typeof createGalleryVerbs>;
