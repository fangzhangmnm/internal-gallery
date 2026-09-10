// StoreUI bundle 工厂（WET 自 WeebPaint src/store-ui.ts，2026-09-09 包化）：createStore 必填的 ui = busy / resolveConflict / reportError + text / offlineEscape。
// 政策进包（提案 §4）：sync.pushing / file.renaming 是后台节律 → 走通知条不上全屏遮罩；其余 key = 用户动作 → 宿主 busy。
// 冲突必 surface（ADR-0009）：按 occasion 分两套按钮，永不静默 cancel。错误必 surface：CloudNetworkError 换人话、级别不降。
import type { StoreUI, StoreTextKey, StoreTextParams } from "@internal/store";
import type { NoticeHandle, NoticeOpts } from "@internal/workbench-elements";
import { t, type GalleryTextKey } from "../core/text.ts";
import type { NameBoundary } from "../core/model/gallery-model.ts";

/** 宿主提供的 sheet 面（WeebPaint sheets.ts / WXHW sheets.ts 同形；本包不出 sheet UI）。 */
export interface SyncGateSheets {
  lockSyncGate<T = string>(o: { title: string; message: string; showSpinner?: boolean; note?: string; actions: { label: string; value: T; primary?: boolean }[] }): Promise<T>;
  settleSyncGate(value: unknown): void;
}
export interface StoreUIDeps {
  busy: <T>(label: string, fn: () => Promise<T>) => Promise<T>;          // 全屏遮罩（可重入）
  showNotice: (opts: NoticeOpts) => NoticeHandle;                          // @internal/workbench-elements
  sheets: SyncGateSheets;
  reportError: (err: unknown, level?: "error" | "warning" | "info" | "log") => void;
  naming?: NameBoundary;
  /** 宿主 i18n 接管 store 的 busy 文案（不给 = 包内默认 st.*）。 */
  text?: (key: StoreTextKey, params?: StoreTextParams) => string | undefined;
}
// StoreTextKey（库的 busy 文案 key）→ 本包文案 key。穷举 Record：库加 key 本表漏映 = 编译错。
const STORE_TEXT_KEYS: Record<StoreTextKey, GalleryTextKey> = {
  "sync.pushing": "st.syncPushing", "file.renaming": "st.fileRenaming", "file.pulling": "st.filePulling", "cloud.checking": "st.cloudChecking",
  "file.deleting": "st.fileDeleting", "trash.restoring": "st.trashRestoring", "trash.purging": "st.trashPurging", "trash.emptyTrash": "st.trashEmptyTrash",
  "trash.emptyBackups": "st.trashEmptyBackups", "file.encrypting": "st.fileEncrypting", "file.decrypting": "st.fileDecrypting", "file.rekeying": "st.fileRekeying",
  "file.reuploading": "st.fileReuploading", "folder.creating": "st.folderCreating", "folder.deleting": "st.folderDeleting",
};
const QUIET_KEYS = new Set<StoreTextKey>(["sync.pushing", "file.renaming"]);

export function storeUIFor(d: StoreUIDeps): StoreUI {
  const bare = d.naming?.bare ?? ((s: string) => s);
  let _quietDepth = 0, _quietNotice: NoticeHandle | null = null;
  async function quietBusy<T>(label: string, fn: () => Promise<T>): Promise<T> {
    _quietDepth++;
    if (_quietNotice?.isOpen()) _quietNotice.setText(label);
    else _quietNotice = d.showNotice({ id: "store-quiet-busy", level: "info", text: label, dismissible: false, tapToDismiss: false });
    try { return await fn(); }
    finally { _quietDepth--; if (_quietDepth <= 0) { _quietDepth = 0; _quietNotice?.close(); _quietNotice = null; } }
  }
  return {
    busy: (label, fn, key) => (key && QUIET_KEYS.has(key) ? quietBusy(label, fn) : d.busy(label, fn)),
    text: (key, params) => d.text?.(key, params) ?? (STORE_TEXT_KEYS[key] ? t(STORE_TEXT_KEYS[key], params as Record<string, string | number>) : undefined),
    resolveConflict: async ({ name, occasion }) => {
      const n = bare(name);
      const choice = occasion === "open"
        ? await d.sheets.lockSyncGate<"cancel" | "takeCloud">({ title: t("cf.cloudNewerTitle"), message: t("cf.body.open", { name: n }), note: t("cf.note.keptSafe"), showSpinner: false,
            actions: [{ label: t("cf.act.openLocal"), value: "cancel", primary: true }, { label: t("cf.act.cloudWins"), value: "takeCloud" }] })
        : await d.sheets.lockSyncGate<"keepMine" | "takeCloud" | "cancel">({ title: t("cf.cloudNewerTitle"), message: t("cf.body.push", { name: n }), note: t("cf.note.keptSafe"), showSpinner: false,
            actions: [{ label: t("cf.act.localWins"), value: "keepMine", primary: true }, { label: t("cf.act.cloudWins"), value: "takeCloud" }, { label: t("common.cancel"), value: "cancel" }] });
      return choice ?? "cancel";
    },
    reportError: (err, level) => {
      if ((err as { name?: string } | null)?.name === "CloudNetworkError") { d.reportError(err, "log"); d.reportError(new Error(t("err.cloudNetwork")), level ?? "error"); return; }
      d.reportError(err, level ?? "error");
    },
    offlineEscape: () => {
      let onSkip!: () => void;
      const probe = new Promise<unknown>((res) => { onSkip = () => res(undefined); });
      void d.sheets.lockSyncGate<"skip" | null>({ title: t("cf.checkingCloud"), message: "", showSpinner: true, actions: [{ label: t("cf.skipToOffline"), value: "skip" }] }).then((v) => { if (v === "skip") onSkip(); });
      return { probe, settle: () => d.sheets.settleSyncGate(null) };
    },
  } as StoreUI;
}
