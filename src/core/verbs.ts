// 图库文件管理动词（无 DOM）——WET 自 WeebPaint src/gallery/gallery.ts 的 intents 段（rename/move/copy/resolve/del/
//   deleteImage/folderDelete/asideRestore/asidePurge/emptyAside/encrypt/decrypt/unlock），2026-09-09 抽出成 headless 模块。
// 红线兜底随行（提案 §5）：删=回收站且诚实读 TrashOutcome（store 2.1.2 前叫 DelResult）；改名失败保输入循环重试、错误写进重弹的输入框标题；失败不报成功；
//   移动只给「上级 + 可见子夹」绝不 poll 全树；复制加密源原样搬密文；清空回收站部分失败必说。屏幕层只负责调 + reload。
import { hasLocalCopy, hasCloudCopy, hasUnpushed, type GItem } from "./model/gallery-view-model.ts";
import { ASIDE, type AsideItem, type AsideKind, type AsideScope, type AsideEmptyResult } from "./model/aside.ts";
import { copyTargetName } from "./model/gallery-model.ts";
import { parseVersionStem, versionTargetName, versionsOf, dayStamp } from "./model/versions.ts";
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
  /** ⚠ 0.7.2 起图库不再调它当「推送到云端」按钮（方向动词不在词汇表上）；留给宿主自己的保存路径用。 */
  push(item: GItem): Promise<void>;
  unload(item: GItem): Promise<void>;
  exit(): Promise<void>;
  /** 0.7.2：「处理…」处理的是正在打开的那份且换了世界线 / 进了回收站 → 让宿主重开（GalleryDocHost 必有 open；VerbDoc 层可选）。 */
  open?(item: GItem): Promise<void>;
  dropCheckpoint(identifier: string): Promise<void> | void;
  /** 0.9.1：把正开着的那份内存里的改动落到本机——**不关它、不退回图库、不推云**。「存一版」拿的是存下来的字节，正开着的那份先过这里。
   *  宿主没给 = 不落（那一版 = 上次存下的样子）。⚠ 这不是 exit：exit 会把人从画布踢回图库（0.9.0 的存一版错用了它）。 */
  flush?(): Promise<void>;
}
export interface VerbFile {
  tryMove(to: string): Promise<{ ok: true; where?: string; oldKept?: boolean; oldKeptByUser?: boolean; oldCloudOrphan?: boolean; oldUnknown?: boolean; cloudDeferred?: boolean; oldName?: string } | { ok: false; reason?: "name-collision" | "cancelled"; where?: "local" | "cloud" }>;   // 0.8.9：ok:true 时带 store TryMoveResult 的四面旗（谎报守卫 afterMoveStatus 读）
  /** 0.8.5：store 2.1.2 把 `delete()` 改叫 `trash()`（词对准语义：移进回收站；user 2026-10-17「改trash……属于bugfix」）。 */
  trash(): Promise<{ status: string; queuedCloudDelete?: boolean }>;
  /** 0.7.2：store 0.18 的 file.resolve()——库问人三选一（云端覆盖本地 / 本地覆盖云端 / 取消），图库「处理…」唯一的后端。 */
  resolve(): Promise<{ status: string; reason?: string }>;
  getEncryptedBlob(): Promise<Blob | null>;
  open(): Promise<Blob | null>;
  save(bytes: Blob, opts: { tryPush: boolean; /** 0.9.0（store 2.3.0）：新建的这份生来锁着（存下来的一版）。老版本的库忽略它。 */ bornLocked?: boolean }): Promise<unknown>;
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
    // ── 0.9.0（store ≥ 2.3.0 才有，全部可选：老版本的库没有 = 界面上没有锁 / 星 / 收起）──
    /** 这个库的作品默认只读（createStore({ lockByDefault })）。 */
    lockByDefault?: boolean;
    /** 这个库开了星 / 收起的记号（createStore({ fileMarks })）。 */
    fileMarks?: boolean;
    unlock?(identifier: string): Promise<unknown>;
    lock?(identifier: string): Promise<void>;
    watchUnlocks?(cb: (live: { identifier: string }[]) => void): () => void;
    star?(identifier: string): Promise<void>;
    unstar?(identifier: string): Promise<void>;
    fold?(identifier: string): Promise<void>;
    unfold?(identifier: string): Promise<void>;
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
          if (!r.ok) { if (r.reason === "cancelled") { d.host.status(t("gal.st.cancelled")); return { ok: true }; } return { taken: whereLabel(r.where ?? "local") }; }   // 0.8.10：人在「搬不搬旧的」面里选了取消 = 一个字节没动
          afterMoveStatus(r, t("gal.st.renamed", { to: shownTarget }), item.stem, shownTarget);
          return { ok: true };
        } catch (e: unknown) { return { error: errMsg(e) }; }
      });
      if (result.taken) { candidate = shownTarget; note = t("gal.note.taken", { loc: result.taken }); continue; }
      if (result.error) { candidate = shownTarget; note = t("gal.note.fail", { e: String(result.error) }); continue; }
      return;
    }
  }

  /** 0.8.9（2026-10-26，家族周账 F-92「重命名会多出一份」已复现）：store `tryMove` 在谱系不明 / 云端被别的设备改过时把改名 / 移动**降级成另存**——
   *  新身份推上去、云端旧的原地不动（store 2026-07-18 逃生通道语义：不敢把用户没见过的工作挪进回收站）。库把 oldKept / oldCloudOrphan / oldUnknown / cloudDeferred
   *  旗都给了（store 注释原话「全被吞掉 = UI 谎报成功」），以前这里只看 ok → 报「已重命名」。现在如实说：旧的还在云端、图库里还看得见（纯云端一行），不要了自己送回收站。 */
  function afterMoveStatus(r: { oldKept?: boolean; oldKeptByUser?: boolean; oldCloudOrphan?: boolean; oldUnknown?: boolean; cloudDeferred?: boolean }, okText: string, from: string, to: string): void {
    if (r.oldKept && r.oldKeptByUser) d.host.status(t("gal.st.movedOldKeptByUser", { from, to }));   // 0.8.10：人选的「留着旧的」，不是库拿不准
    else if (r.oldKept) d.host.status(t("gal.st.movedOldKept", { from, to }), true);
    else if (r.oldCloudOrphan) d.host.status(t("gal.st.movedOldOrphan", { from, to }), true);
    else if (r.oldUnknown) d.host.status(t("gal.st.movedOldUnknown", { from, to }), true);
    else if (r.cloudDeferred) d.host.status(t("gal.st.movedCloudDeferred", { to }));
    else d.host.status(okText);
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
        if (!r.ok) { if (r.reason === "cancelled") { d.host.status(t("gal.st.cancelled")); return; } d.host.status(t("gal.st.nameTakenTarget", { loc: whereLabel(r.where ?? "local"), base }), true); return; }   // 0.8.10：取消 = 没动
        if (item.identifier === d.host.activeIdentifier()) d.doc.setIdentifier(newIdentifier);
        afterMoveStatus(r, t("gal.st.moved", { target: target || t("gal.root") }), item.stem, item.stem);   // 0.8.9：移动同样可能降级成「另存」（旧的留在原夹）
      } catch (e: unknown) { d.host.status(t("gal.st.moveFail", { e: errMsg(e) }), true); }
    });
  }

  /** 一份作品「原样」的字节（复制 / 存一版用）：加密件 = 密文容器原样（不解壳不问密码；明文派生物不落持久层），明文件 = open()。
   *  0.9.0 补的洞：纯云端的加密件以前走 open() 拿到的是**解出来的明文**，复制出来就是一份落在本机和云端的明文副本。现在 open() 把它拉到本机之后
   *  再问一次容器；还是拿不到容器、而库说云端那份是加密的（cloudSealed）→ 拒绝（sealed-no-local），不拿明文凑数。 */
  async function atRestBytes(item: GItem): Promise<{ bytes: Blob | null; why?: "sealed-no-local" }> {
    const src = docFile(item.identifier);
    const sealed = await src.getEncryptedBlob();
    if (sealed) return { bytes: sealed };
    const plain = await src.open();
    const sealedAfterPull = await src.getEncryptedBlob();
    if (sealedAfterPull) return { bytes: sealedAfterPull };
    if (item.cloudSealed) return { bytes: null, why: "sealed-no-local" };
    return { bytes: plain };
  }

  /** 复制：字节 = atRestBytes（加密源原样搬密文）；目标 = 同夹「<主干> 副本」按当前夹快照去重，后缀不动。 */
  async function copy(item: GItem, currentIdentifiers: readonly string[]): Promise<void> {
    await d.host.busy(t("gal.busy.copy", { base: item.stem }), async () => {
      try {
        const got = await atRestBytes(item);
        if (got.why === "sealed-no-local") { d.host.status(t("gal.st.sealedNoLocal"), true); return; }
        const bytes = got.bytes;
        if (!bytes) { d.host.status(t("gal.st.copyNoBytes"), true); return; }
        const taken = new Set(currentIdentifiers);
        const newIdentifier = copyTargetName(item.identifier, (n) => taken.has(n), ids());
        await docFile(newIdentifier, "new").save(bytes, { tryPush: cloudOn() });
        d.host.status(t("gal.st.copied", { name: stemOf(newIdentifier) }));
      } catch (e: unknown) { d.host.status(t("gal.st.copyFail", { e: errMsg(e) }), true); }
    });
  }

  async function unload(item: GItem): Promise<void> { await d.doc.unload(item); }
  /** 0.3.0（JRB）：纯云端件「留一份离线」——不打开文档，只囤字节（读者在 wifi 下把一晚要读的先囤好）。与 pullLocal（= 打开即缓存）分工。失败走 status 不抛。 */
  async function keepOffline(item: GItem): Promise<void> {
    await d.host.busy(t("gal.busy.keepOffline", { name: item.stem }), async () => {
      try { await docFile(item.identifier).keepOffline(); d.host.status(t("gal.st.keptOffline", { name: item.stem })); }
      catch (e: unknown) { d.host.status(t("gal.st.keepOfflineFail", { e: errMsg(e) }), true); }
    });
  }

  /** 「处理…」（0.7.2）——这份没同步好（没传 / 冲突 / 云端没了 / 从没传过）的**唯一**动作：交给库的 `file.resolve()`，由库问人三选一
   *  （云端覆盖本地 / 本地覆盖云端 / 取消）。图库不再有「推送到云端」「重新上传」这类替人定方向的按钮（user 2026-10-16「这个动词一开始就不合法，
   *  不在词汇表上」「这个按钮为什么能存在是更大的安全问题」）。正在打开的那份：先让编辑器把内存里的落盘（d.doc.exit = flushLocal），
   *  处理完若换了世界线 / 进了回收站，让宿主重开（d.doc.open）。 */
  async function resolve(item: GItem): Promise<void> {
    const isActive = item.identifier === d.host.activeIdentifier();
    // 0.8.8：**不包在宿主 busy 里**——`file.resolve()` 中途要弹面问人；宿主的 busy 要是一层模态遮罩，面就被挡死（CatsUp 2026-10-25 iPad 截图
    //   「没处理成：…sheet "choice" opened while busy overlay is active (would deadlock)…」；WXHW 同病，周账 F-91）。推 / 拉的忙碌提示店库自己有
    //   busy 键（sync.pushing / file.pulling / cloud.checking），宿主按键路由；这里只管状态行。防双击：同一份在飞时再点一次直接忽略。
    if (_resolving.has(item.identifier)) return;
    _resolving.add(item.identifier);
    try {
      if (isActive) await d.doc.exit();
      const r = await docFile(item.identifier).resolve();
      const key = r.status === "took-cloud" ? "gal.st.resolve.tookCloud" : r.status === "pushed" ? "gal.st.resolve.pushed" : r.status === "trashed" ? "gal.st.resolve.trashed"
        : r.status === "cancelled" ? "gal.st.resolve.cancelled" : r.status === "clean" ? "gal.st.resolve.clean" : r.status === "offline" ? "gal.st.resolve.offline" : "gal.st.resolve.unresolved";
      const bad = key === "gal.st.resolve.offline" || key === "gal.st.resolve.unresolved";
      if (r.status === "unresolved" && r.reason === "starred") d.host.status(t("gal.st.resolve.starred", { name: item.stem }), true);   // 0.9.0 星：面里选了「这份进回收站」，库没动
      else d.host.status(t(key, { name: item.stem, e: r.reason ?? r.status }), bad);
      if (isActive && (r.status === "took-cloud" || r.status === "trashed") && d.doc.open) await d.doc.open(item);
    } catch (e: unknown) { d.host.status(t("gal.st.resolve.unresolved", { name: item.stem, e: errMsg(e) }), true); }
    finally { _resolving.delete(item.identifier); }
  }
  const _resolving = new Set<string>();

  /** 删除 = 移回收站（store 的 `file.trash()`）；诚实读 TrashOutcome（cancelled / noop / 只删了本地 都不许报「已删除」）。 */
  async function del(item: GItem): Promise<void> {
    const isActive = item.identifier === d.host.activeIdentifier();
    const isLocal = hasLocalCopy(item.syncState), isCloud = hasCloudCopy(item.syncState);
    const dirty = isLocal && isCloud && hasUnpushed(item.syncState);
    if (item.starred) { d.host.status(t("gal.st.starredNoDel", { name: item.stem }), true); return; }   // 0.9.0 星：不弹确认，直接说先撤星（库那一层也拦，StarredError）
    let detail = isLocal && isCloud ? (dirty ? t("gal.del.dirtyDetail") : t("gal.del.syncedDetail")) : isCloud ? t("gal.del.cloudDetail") : t("gal.del.localDetail");
    if (isActive) detail += t("gal.del.activeSuffix");
    if (!(await d.host.confirm(t("gal.dlg.delTitle", { name: item.stem }), detail))) return;
    await d.host.busy(t("gal.busy.del", { name: item.stem }), async () => {
      try {
        const del = await docFile(item.identifier).trash();
        if (del.status === "cancelled") { d.host.status(t("gal.st.delCancelled", { name: item.stem })); return; }
        void d.doc.dropCheckpoint(item.identifier);
        if (isActive) await d.doc.exit();
        d.host.status(del.status === "noop" ? t("gal.st.delNothing", { name: item.stem })
          : del.queuedCloudDelete === false ? t("gal.st.delLocalOnly", { name: item.stem })
          : t("gal.st.deleted", { name: item.stem }), del.status === "noop" || del.queuedCloudDelete === false);
      } catch (e: unknown) { d.host.status(isStarredError(e) ? t("gal.st.starredNoDel", { name: item.stem }) : t("gal.st.delFail", { e: errMsg(e) }), true); }   // 0.9.0：列表还没带上星（别的设备刚加的）时库会拦
    });
  }
  async function deleteImage(img: { identifier: string; label: string }): Promise<void> {
    if (!(await d.host.confirm(t("gal.dlg.delTitle", { name: img.label }), t("gal.del.imageDetail")))) return;
    await d.host.busy(t("gal.busy.del", { name: img.label }), async () => {
      try {
        const del = await d.store().file(img.identifier, { mode: "existing" }).trash();
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
  // ── 0.9.0：锁（改内容之前手动解）/ 星 / 收起 / 存一版。全部走 store 的面，这里只管说话；老版本的库没有这些面 = 响亮说做不了，不装成做了。──
  const isStarredError = (e: unknown): boolean => (e as { name?: unknown } | null)?.name === "StarredError";
  const filesFace = () => d.store().files;
  /** 解锁这份作品（之后能改）。**只在人点了钮之后调**。成 → true。 */
  async function unlockEdit(item: GItem): Promise<boolean> {
    try {
      const f = filesFace();
      if (!f.unlock) throw new Error("this library has no edit lock (needs @internal/store >= 2.3.0)");
      await f.unlock(item.identifier);
      d.host.status(t("gal.st.editUnlocked", { name: item.stem }));
      return true;
    } catch (e: unknown) { d.host.status(t("gal.st.editLockFail", { e: errMsg(e) }), true); return false; }
  }
  /** 提前锁上（车钥匙那一下）。 */
  async function lockEdit(item: GItem): Promise<void> {
    try {
      const f = filesFace();
      if (!f.lock) throw new Error("this library has no edit lock (needs @internal/store >= 2.3.0)");
      await f.lock(item.identifier);
      d.host.status(t("gal.st.editLocked", { name: item.stem }));
    } catch (e: unknown) { d.host.status(t("gal.st.editLockFail", { e: errMsg(e) }), true); }
  }
  async function setMark(item: GItem, which: "star" | "unstar" | "fold" | "unfold"): Promise<void> {
    const okKey = ({ star: "gal.st.starred", unstar: "gal.st.unstarred", fold: "gal.st.folded", unfold: "gal.st.unfolded" } as const)[which];
    try {
      const fn = filesFace()[which];
      if (!fn) throw new Error("this library has no stars / tuck-away (needs @internal/store >= 2.3.0 with fileMarks)");
      await fn.call(filesFace(), item.identifier);
      d.host.status(t(okKey, { name: item.stem }));
    } catch (e: unknown) { d.host.status(t("gal.st.marksFail", { e: errMsg(e) }), true); }
  }
  /** 存一版 = 复制一份，名字 `<原主干>.backup-<今天>`（同一天再存 `-2`…），和原作同一个文件夹，生来锁着（规则 = core/model/versions.ts）。
   *  mode "new" = 多一份；"replace-last" = 存到上一版：**先存成新的、成了才把上一份送进回收站**（顺序不能反：先有新的再丢旧的）；上一版加了星 → 留着不动、如实说。
   *  字节 = 这份作品已经存下的样子（atRestBytes：加密件原样搬密文）；正开着的那份先让编辑器落盘（d.doc.flush：只落盘、不关画）。
   *  siblings = 当前夹的作品（起名去重、找上一版用）。存成 → 新那一版的身份；没存成 → null（状态行已经说了为什么）。opts.now 只给测试。 */
  async function saveVersion(item: GItem, mode: "new" | "replace-last", siblings: readonly GItem[], opts: { now?: Date } = {}): Promise<string | null> {
    return d.host.busy(t("gal.busy.version", { base: item.stem }), async (): Promise<string | null> => {
      try {
        if (item.identifier === d.host.activeIdentifier()) await d.doc.flush?.();   // 0.9.1：只落盘，不关画（0.9.0 这里调 exit，在画布上点「存一版再改」会把人踢回图库）
        const got = await atRestBytes(item);
        if (got.why === "sealed-no-local") { d.host.status(t("gal.st.sealedNoLocal"), true); return null; }
        if (!got.bytes) { d.host.status(t("gal.st.copyNoBytes"), true); return null; }
        const originStem = parseVersionStem(item.stem)?.base ?? item.stem;                       // 给一版再存一版 = 还是那份原作的版本
        const previous = versionsOf({ ...item, stem: originStem, identifier: "\u0000" }, siblings)[0] ?? null;   // 现有的最新一版（存之前认好）
        const taken = new Set(siblings.map((s) => s.identifier));
        const day = dayStamp(opts.now);
        let target = "";
        for (let attempt = 0; ; attempt++) {
          target = versionTargetName(item.identifier, day, (n) => taken.has(n), ids());
          try { await docFile(target, "new").save(got.bytes, { tryPush: cloudOn(), bornLocked: true }); break; }
          catch (e: unknown) {   // 名字在列表之外被占了（云端有、这一夹的帧还没到）：库的 mode:"new" 不覆盖同名 → 换下一个序号再试
            if ((e as { name?: unknown } | null)?.name !== "CloudNameCollisionError" || attempt >= 8) throw e;
            taken.add(target);
          }
        }
        const name = stemOf(target);
        if (mode === "new" || !previous) { d.host.status(t("gal.st.versionSaved", { name })); return target; }
        try {
          const r = await docFile(previous.identifier).trash();
          if (r.status === "cancelled" || r.status === "noop") d.host.status(t("gal.st.versionReplaceKept", { name, e: r.status }), true);
          else d.host.status(t("gal.st.versionReplaced", { name }));
        } catch (e: unknown) { d.host.status(isStarredError(e) ? t("gal.st.versionReplaceStarred", { name }) : t("gal.st.versionReplaceKept", { name, e: errMsg(e) }), true); }
        return target;
      } catch (e: unknown) { d.host.status(t("gal.st.versionFail", { e: errMsg(e) }), true); return null; }
    });
  }
  /** 「存一版再改」：先存一版，成了才解锁（没存成 = 不解，免得人以为留了底其实没有）。 */
  async function saveVersionThenUnlock(item: GItem, siblings: readonly GItem[], opts: { now?: Date } = {}): Promise<boolean> {
    if (!(await saveVersion(item, "new", siblings, opts))) return false;
    return unlockEdit(item);
  }

  async function unlock(name: string): Promise<boolean> {
    const ok = !!(await d.encryption?.ensureUnlocked(name));
    if (ok) d.host.status(t("gal.st.unlocked"));
    return ok;
  }

  return { rename, move, moveTargets, copy, resolve, unload, keepOffline, del, deleteImage, folderDelete, asideRestore, asidePurge, emptyAside, encryptItem, decryptItem, unlock, whereLabel,
    unlockEdit, lockEdit, saveVersion, saveVersionThenUnlock,   // 0.9.0 锁 / 存一版（unlock = 加密的那把锁，老名字不动；这把叫 unlockEdit）
    star: (item: GItem) => setMark(item, "star"), unstar: (item: GItem) => setMark(item, "unstar"), fold: (item: GItem) => setMark(item, "fold"), unfold: (item: GItem) => setMark(item, "unfold") };
}
export type GalleryVerbs = ReturnType<typeof createGalleryVerbs>;
