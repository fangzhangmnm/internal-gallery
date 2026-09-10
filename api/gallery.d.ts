import { Item } from '@internal/store';
import type { NoticeHandle } from '@internal/workbench-elements';
import type { NoticeOpts } from '@internal/workbench-elements';
import type { StoreTextKey } from '@internal/store';
import type { StoreTextParams } from '@internal/store';
import type { StoreUI } from '@internal/store';
import { TrashItem } from '@internal/store';
import { WatchFolderErrorPhase } from '@internal/store';

export declare function activeGalleryId(): string;

/** 面积平均缩小（straight RGBA → straight RGBA；premult 累加、反预乘）。放大时退化为近似盒复制，别用。 */
export declare function areaResampleRgba(src: Uint8ClampedArray, sw: number, sh: number, tw: number, th: number): Uint8ClampedArray;

export declare interface AttachmentDeps {
    storeAbsent: boolean;
    buildStore: (entry: GalleryEntry) => SwappableStore;
    swap: (next: SwappableStore | null) => Promise<void>;
    registry: Pick<GalleryRegistry, "touch" | "relabel" | "clearLastActive">;
    hasOpenGalleryDoc: () => boolean;
    requestPersist: () => void;
    setActiveGalleryId: (id: string | null) => void;
    reportError: (e: unknown) => void;
}

export declare type AttachmentState = {
    kind: "detached";
} | {
    kind: "attached";
    entry: GalleryEntry;
    online: boolean;
};

/** 备份 zip 的内存护栏（超过就不再往包里塞，剩下的逐件下载）。常量可调。 */
export declare const BACKUP_BUDGET_BYTES: number;

/** 备份包文件名 = weebpaint-backup-YYYYMMDD-HHMM.zip（复用命名器官的下载分钟戳）。 */
export declare const backupArchiveName: (now?: Date) => string;

/** 清单里的一件（size 只是列举给的估值，可能缺；真预算用读到的字节算）。 */
export declare interface BackupFileRef {
    path: string;
    size?: number;
    syncState?: string;
}

export declare interface BackupFlowPorts {
    watchFolder: WatchFolderFn;
    readFile(path: string): {
        getEncryptedBlob(): Promise<Blob | null>;
        isEncrypted(): Promise<boolean>;
        open(): Promise<Blob | null>;
        offload(): Promise<unknown>;
    };
    isCached(syncState: string): boolean;
    pack(entries: {
        path: string;
        data: Blob;
    }[]): Promise<Blob>;
    deliver(blob: Blob, filename: string): void;
    confirm(title: string, message: string): Promise<boolean>;
    busy<T>(label: string, fn: () => Promise<T>): Promise<T>;
    setBusyText(msg: string): void;
    status(msg: string, isError?: boolean): void;
    reportError(e: unknown, level: "warning" | "error" | "log"): void;
    appName?: string;
}

export declare interface BackupPorts {
    /** 取一件的 at-rest 字节（加密件应给密文；拿不到 → null，进失败清单）。 */
    readBytes(path: string): Promise<Blob | null>;
    /** 打包（宿主接 zip.ts 的 zipPack，STORE 不压缩——ora/png 本就是压缩流）。 */
    pack(entries: {
        path: string;
        data: Blob;
    }[]): Promise<Blob>;
    /** 交付一个 blob 给用户（宿主接 triggerDownload）。 */
    deliver(blob: Blob, filename: string): void;
    onProgress?(done: number, total: number, path: string): void;
    /** 单件失败的诊断出口（不打断整批）。 */
    onError?(path: string, err: unknown): void;
}

export declare interface BackupReport {
    total: number;
    zipped: number;
    zippedNames: string[];
    spilled: number;
    spilledNames: string[];
    failed: string[];
    bytes: number;
    archiveName: string | null;
    overBudget: boolean;
}

export declare type BadgeKind = "syncedBoth" | "dirtyBoth" | "cloudOnly" | "localOnly" | "float" | "ghost" | "pendingGone" | "newerOnCloud" | "conflictBoth";

export declare function breadcrumb(folder: string): Crumb[];

export declare interface CachedThumb {
    token: string;
    blob: Blob;
    at: number;
}

export declare interface ChangePasswordDeps {
    /** 本机有字节的加密件（库全名）。 */
    targets: string[];
    oldPassword: string;
    newPassword: string;
    rekey: (name: string, newPassword: string) => Promise<{
        status: string;
    }>;
    /** 显式登记「这件用 pw」（不许做等于全局的短路）。 */
    rememberFilePassword: (name: string, pw: string) => void;
    forgetFilePassword: (name: string) => void;
    /** 提交新密码：verifier + 全局内存密码。只在 targets 登记完旧钥之后调、rekey 之前调。 */
    commitNewPassword: (pw: string) => Promise<void>;
    onProgress?: (done: number, total: number, name: string) => void;
    onError?: (name: string, e: unknown) => void;
}

export declare function changePasswordFlow(p: ChangePasswordPorts): Promise<void>;

export declare interface ChangePasswordPorts {
    hasVerifier(): boolean;
    checkVerifier(pw: string): Promise<"ok" | "bad" | "none">;
    createVerifier(pw: string): Promise<void>;
    promptPassword(o: {
        title: string;
        message: string;
    }): Promise<string | null>;
    setPassword(pw: string): void;
    setFilePassword(name: string, pw: string): void;
    forgetFilePassword(name: string): void;
    confirm(title: string, message: string): Promise<boolean>;
    flow<T>(fn: () => Promise<T>): Promise<T>;
    busy<T>(label: string, fn: () => Promise<T>): Promise<T>;
    setBusyText(msg: string): void;
    watchFolder: WatchFolderFn;
    isCached(syncState: string): boolean;
    file(fullName: string): {
        isEncrypted(): Promise<boolean>;
        rekey(o: {
            newPassword: string;
            isOnline: () => boolean;
        }): Promise<{
            status: string;
        }>;
    };
    isOnline(): boolean;
    naming?: NameBoundary;
    invalidateThumb(bareName: string): Promise<void>;
    invalidateEncrypted(bareName: string): void;
    refresh(): void;
    status(msg: string, isError?: boolean): void;
    reportError(e: unknown, level: "log"): void;
}

export declare interface ChangePasswordReport {
    moved: string[];
    kept: {
        name: string;
        status: string;
    }[];
}

declare function clear(): void;

export declare function closeGalleryFlow(p: GalleryOpenPorts): Promise<void>;

export declare interface CloudAuthChipEls {
    iconBtn: HTMLElement;
    accountInfo: HTMLElement;
    refreshBtn: HTMLElement;
}

export declare interface CloudAuthPort {
    isSignedIn(): boolean;
    isAuthConfigured(): boolean;
    activeAccount(): {
        username?: string;
        name?: string;
    } | null;
    retrySilentSignIn(): Promise<unknown>;
}

export declare interface CloudFile {
    path: string;
    name?: string;
    lastModifiedDateTime?: string;
}

export declare interface CloudFileMeta extends CloudFile {
    id?: string;
    size?: number;
}

export declare interface CloudImageItem {
    path: string;
    name: string;
    size?: number;
    lastModified?: number;
    cached: boolean;
}

export declare interface CloudOtherItem {
    path: string;
    name: string;
    size?: number;
    lastModified?: number;
}

export declare function configureDeviceKv(kv: DeviceKv): void;

/** 宿主接管文案（缺 key 时宿主返回 null/undefined/空串 → 落回默认）。 */
export declare function configureText(opts: {
    t?: (key: GalleryTextKey, params?: Record<string, string | number>) => string | null | undefined;
    lang?: GalleryLang;
}): void;

export declare function copyTargetName(sourceName: string, taken: (name: string) => boolean): string;

export declare function crc32(bytes: Uint8Array, from?: number, to?: number): number;

/** 累计字节预算。admit 返 "spill" = 这件（及之后全部）不进 zip，改逐件下载。
 *  一旦溢出就**不再回头**——包一旦封顶就是封顶，别让小文件插队造成「有的进包有的没进」的迷惑顺序。 */
export declare function createByteBudget(budget: number): {
    admit(bytes: number): "zip" | "spill";
    used(): number;
    spilling(): boolean;
};

export declare function createFirstFrameWatchdog(onStall: (info: {
    folder: string;
    elapsedMs: number;
}) => void, opts?: {
    timeoutMs?: number;
    timers?: WatchdogTimers;
    now?: () => number;
}): FirstFrameWatchdog;

export declare function createFrameGate<T>(apply: (frame: T) => void, opts?: {
    tailMs?: number;
    maxHoldMs?: number;
    timers?: FrameGateTimers;
}): FrameGate<T>;

export declare function createGallery(el: HTMLElement, deps: CreateGalleryDeps): Gallery;

export declare function createGalleryAttachment(deps: AttachmentDeps): GalleryAttachment;

/** 当前库「在线可推」谓词（0828 bug 修：folder 挂着仍显无云——isSignedIn 是 MSAL 词，folder 库别问它）。
 *  SSoT = attachment 器官的 online 旗（folder=权限已授，**本地即在线与网络无关**；onedrive=登录态）；
 *  onedrive 额外 && navigator.onLine（浏览器离线推不动）。全 app 问「云腿现在能不能推」只准问这里。 */
export declare function createGalleryCapability(deps: {
    attachment: Pick<GalleryAttachment, "state">;
    hasLiveStore: () => boolean;
    onLine?: () => boolean;
}): GalleryCapability;

export declare function createGalleryDataFace(deps: {
    store: () => DataFaceStore | null;
    policy?: DataFacePolicy;
}): {
    /** 订阅当前夹：立即本地帧、云端到了同一 cb 再闪。文档 natural 倒序；图片按修改时间倒序；杂物显示不打开；子夹自然正序。 */
    watchFolder(folder: string, cb: (snap: GallerySnapshot) => void, opts?: {
        onError?: (err: unknown, phase: WatchFolderErrorPhase) => void;
    }): () => void;
    watchFolderImages(folder: string, cb: (snap: {
        path: string;
        images: CloudImageItem[];
        folderNames: string[];
    }) => void): () => void;
    openCloudImage: (path: string) => Promise<Blob | null>;
    /** 回收站：store 两端聚合的 TrashItem[] → TrashGItem（只元数据，无 blob）。 */
    listTrash: () => Promise<TrashGItem[]>;
};

export declare interface CreateGalleryDeps extends Omit<GalleryScreenDeps, "data" | "thumbs" | "store"> {
    store: () => (VerbStore & DataFaceStore) | null;
    policy: DataFacePolicy & {
        naming?: NameBoundary;
        /** 缩略图：不给 = 无缩略图（WXHW 2.0）。peek 从 store getPeek 读 app 域 entry（WeebPaint: Thumbnails/thumbnail.png）。 */
        thumbs?: {
            fetch: (name: string, source: ThumbSource) => Promise<Blob>;
            store?: ThumbStore;
            dbName?: string;
            galleryId?: () => string; /** 0.2.1：哪些文档有缩略图可取（WXHW：只有书）。 */
            has?: (fullName: string) => boolean;
        };
    };
    text?: {
        t?: (key: GalleryTextKey, params?: Record<string, string | number>) => string | null | undefined;
        lang?: GalleryLang;
    };
    deviceKv?: DeviceKv;
}

export declare function createGalleryRegistry(kv: RegistryKV): GalleryRegistry;

export declare function createGalleryVerbs(d: VerbDeps): {
    rename: (item: GItem) => Promise<void>;
    move: (item: GItem, ctx: {
        folder: string;
        folderNames: string[];
    }) => Promise<void>;
    moveTargets: (item: GItem, ctx: {
        folder: string;
        folderNames: string[];
    }) => string[];
    copy: (item: GItem, currentNames: readonly string[]) => Promise<void>;
    push: (item: GItem) => Promise<void>;
    unload: (item: GItem) => Promise<void>;
    reupload: (item: GItem) => Promise<void>;
    del: (item: GItem) => Promise<void>;
    deleteImage: (img: {
        path: string;
        name: string;
    }) => Promise<void>;
    folderDelete: (ft: {
        name: string;
        path: string;
    }) => Promise<void>;
    trashRestore: (item: TrashGItem) => Promise<void>;
    trashPurge: (item: TrashGItem) => Promise<void>;
    emptyTrash: (scope?: "local" | "cloud" | "both") => Promise<void>;
    encryptItem: (item: GItem) => Promise<void>;
    decryptItem: (item: GItem) => Promise<void>;
    unlock: (name: string) => Promise<boolean>;
    whereLabel: (where: "local" | "cloud") => string;
};

/** 配额告警（只在档位变化时说一次）。返回本次是否发了告警。 */
export declare function createQuotaWarner(status: (msg: string, isError?: boolean) => void): () => Promise<boolean>;

export declare function createThumbCache(deps: ThumbCacheDeps): ThumbCache;

export declare interface Crumb {
    label: string;
    path: string;
    current: boolean;
}

export declare interface DataFacePolicy {
    isDoc?: (path: string) => boolean;
    isImage?: (path: string) => boolean;
    naming?: NameBoundary;
}

/** 数据面能看见的 store 子集（多库切换后实例会变，所以是 getter）。 */
export declare interface DataFaceStore {
    files: {
        watchFolder(folder: string, cb: (snap: {
            path: string;
            items: Item[];
            folders: string[];
            complete: boolean;
        }) => void, opts?: {
            onError?: (err: unknown, phase: WatchFolderErrorPhase) => void;
        }): () => void;
        listTrash(): Promise<TrashItem[]>;
    };
    file(name: string, opts: {
        isZip: false;
        mode: "existing";
    }): {
        open(): Promise<Blob | null>;
    };
}

/** 包内默认 t：按 lang 取，缺 → zh → key。 */
export declare const defaultT: GalleryT;

export declare type DetachResult = {
    ok: true;
} | {
    ok: false;
    reason: "doc-open";
} | {
    ok: false;
    reason: "dirty";
    dirtyCount: number;
};

export declare interface DeviceKv {
    get(key: string): string | null;
    set(key: string, v: string | null): void;
}

export declare function deviceKvGet(key: string): string | null;

export declare function deviceKvGetJson<T>(key: string, fallback: T): T;

export declare function deviceKvSet(key: string, v: string | null): void;

export declare function deviceKvSetJson(key: string, v: unknown): void;

declare interface DiagEntry {
    t: number;
    l: DiagLevel;
    m: string;
}

declare type DiagLevel = "error" | "warning" | "info" | "log" | "note";

export declare namespace diagLog {
    export {
        flush,
        record,
        note,
        entries,
        clear,
        toText,
        initDiagLog,
        DiagLevel,
        DiagEntry
    }
}

/** FSA 目录句柄的最小面（node 可测；浏览器 FileSystemDirectoryHandle 结构满足）。 */
export declare interface DirHandleLike {
    readonly name: string;
    isSameEntry(other: DirHandleLike): Promise<boolean>;
}

/** 下载版本时间戳 = YYYYMMDD-HHMM。 */
export declare function downloadStamp(now?: Date): string;

declare function entries(): readonly DiagEntry[];

/** 明文容器 → entry 原始字节 Blob；加密容器 → 密文 peek Blob(ENC_PEEK_MIME)。取不到 → 抛（caller 显占位）。source="cloud" 绝不静默落回本地。 */
export declare function fetchZipEntryThumb(file: PeekableFile, source: "local" | "cloud", opts?: {
    zipEntry?: string;
    bytesLength?: number;
}): Promise<Blob>;

export declare interface FirstFrameWatchdog {
    arm(folder: string): void;
    frame(folder: string): void;
    cancel(): void;
    isArmed(): boolean;
}

/** 等比缩到长边 ≤ maxEdge；永不放大。 */
export declare function fitWithin(w: number, h: number, maxEdge: number): {
    w: number;
    h: number;
};

/** RGBA 平铺到白底（就地写，返回同一 buffer）：jpeg 无 alpha，透明区不平铺会糊成黑。 */
export declare function flattenOntoWhite(data: Uint8ClampedArray): Uint8ClampedArray;

/** 拍平白底（in place）：straight RGBA → 不透明。缩略图/JPEG 无 alpha 场景用。 */
export declare function flattenWhiteInPlace(rgba: Uint8ClampedArray): Uint8ClampedArray;

/** 立即落盘（pagehide / 清空时调；平时 250ms 合并）。存储不可用时 device-kv 内存降级，本函数不抛。 */
declare function flush(): void;

/** 一夹的一次性快照结果。authoritative:false = 这夹没拿到权威帧（离线/未登录/列举失败），清单可能缺项。 */
export declare interface FolderProbe {
    path: string;
    files: BackupFileRef[];
    folders: string[];
    authoritative: boolean;
}

export declare interface FrameGate<T> {
    push(frame: T): void;
    pointerDown(): void;
    pointerUp(): void;
    reset(): void;
    isHeld(): boolean;
}

export declare interface FrameGateTimers {
    set(fn: () => void, ms: number): unknown;
    clear(handle: unknown): void;
}

export declare interface Gallery {
    handle: GalleryHandle;
    data: ReturnType<typeof createGalleryDataFace>;
    thumbs: ThumbCache | null;
}

/** 能力变更广播（window 事件；消费方自己重读 hasGallery()）。P3 起由换库事件驱动。 */
export declare const GALLERY_CAPABILITY_EVENT = "wp:gallery-capability-changed";

export declare const GALLERY_PACKAGE_BIRTH: "2026-09-09";

export declare const GALLERY_TEXT: {
    readonly "bk.andMore": {
        readonly zh: "……等 {n} 件（全量名单在包内 backup-manifest.txt）";
        readonly en: "…and {n} more (full list in backup-manifest.txt inside the zip)";
        readonly ja: "…ほか {n} 件（全リストは zip 内の backup-manifest.txt）";
    };
    readonly "bk.done": {
        readonly zh: "已下载备份 {name}（{n} 件）";
        readonly en: "Backup downloaded: {name} ({n} files)";
        readonly ja: "バックアップをダウンロードしました：{name}（{n} 件）";
    };
    readonly "bk.empty": {
        readonly zh: "图库里没有可备份的文件";
        readonly en: "Nothing in this gallery to back up";
        readonly ja: "バックアップできるファイルがありません";
    };
    readonly "bk.failed": {
        readonly zh: "备份失败：{err}";
        readonly en: "Backup failed: {err}";
        readonly ja: "バックアップに失敗しました：{err}";
    };
    readonly "bk.failedDetail": {
        readonly zh: "取不到、不在本次备份里的 {n} 件（离线的纯云端件/锁定的加密件等）：";
        readonly en: "{n} file(s) could NOT be read and are NOT in this backup (cloud-only while offline, locked encrypted, …):";
        readonly ja: "取得できず今回のバックアップに含まれない {n} 件（オフラインのクラウド専用・ロック中の暗号化など）：";
    };
    readonly "bk.failedN": {
        readonly zh: "{n} 件未能取到（纯云端且离线？稍后重试）";
        readonly en: "{n} files could not be read (cloud-only while offline? try again later)";
        readonly ja: "{n} 件を取得できませんでした（クラウドのみ・オフライン？後で再試行してください）";
    };
    readonly "bk.msg": {
        readonly zh: "把这个图库里的全部文件打包成一个 zip 下载到本机。只读取，不改动图库。加密作品保持密文原样（备份里没有明文）。超过 {size} 的部分改为逐件下载。";
        readonly en: "Packs every file in this gallery into one zip and downloads it. Read-only — the gallery is not modified. Encrypted artworks stay as ciphertext (no plaintext in the backup). Anything beyond {size} is downloaded file by file instead.";
        readonly ja: "このギャラリーの全ファイルを 1 つの zip にまとめてダウンロードします。読み取りのみで、ギャラリーは変更しません。暗号化された作品は暗号文のまま（バックアップに平文は入りません）。{size} を超えた分は 1 ファイルずつダウンロードします。";
    };
    readonly "bk.packing": {
        readonly zh: "正在备份…（{done} / {total}）";
        readonly en: "Backing up… ({done} / {total})";
        readonly ja: "バックアップ中…（{done} / {total}）";
    };
    readonly "bk.partialN": {
        readonly zh: "{n} 个文件夹未能完整列举，备份可能不全";
        readonly en: "{n} folders could not be listed in full — the backup may be incomplete";
        readonly ja: "{n} 個のフォルダーを完全に一覧できませんでした。バックアップが不完全な可能性があります";
    };
    readonly "bk.scanning": {
        readonly zh: "正在清点图库…";
        readonly en: "Scanning the gallery…";
        readonly ja: "ギャラリーを確認中…";
    };
    readonly "bk.scanningFolders": {
        readonly zh: "正在清点图库…（已扫 {n} 个文件夹）";
        readonly en: "Scanning the gallery… ({n} folders)";
        readonly ja: "ギャラリーを確認中…（{n} フォルダー）";
    };
    readonly "bk.spilled": {
        readonly zh: "库太大，另有 {n} 件改为逐件下载";
        readonly en: "Library too large — {n} more files downloaded individually";
        readonly ja: "ライブラリが大きいため、他の {n} 件は個別にダウンロードしました";
    };
    readonly "bk.spilledDetail": {
        readonly zh: "超出 zip 预算、已改为逐件下载的 {n} 件（一件不丢，注意浏览器多文件下载确认）：";
        readonly en: "{n} file(s) over the zip budget were delivered as individual downloads (nothing dropped — watch for the browser multi-download prompt):";
        readonly ja: "zip 予算超過のため個別ダウンロードになった {n} 件（欠落なし。ブラウザの複数ダウンロード確認に注意）：";
    };
    readonly "bk.title": {
        readonly zh: "下载全库备份";
        readonly en: "Download full backup";
        readonly ja: "ライブラリ全体をバックアップ";
    };
    readonly "bk.truncated": {
        readonly zh: "文件夹太多，只扫到前 {n} 个，备份不全";
        readonly en: "Too many folders — only the first {n} were scanned; the backup is incomplete";
        readonly ja: "フォルダーが多すぎます。最初の {n} 個のみを走査しました。バックアップは不完全です";
    };
    readonly "cf.act.cloudWins": {
        readonly zh: "云端覆盖本地";
        readonly en: "Cloud overwrites local";
        readonly ja: "クラウドでローカルを上書き";
    };
    readonly "cf.act.localWins": {
        readonly zh: "本地覆盖云端";
        readonly en: "Local overwrites cloud";
        readonly ja: "ローカルでクラウドを上書き";
    };
    readonly "cf.act.openLocal": {
        readonly zh: "打开本地";
        readonly en: "Open local";
        readonly ja: "ローカルを開く";
    };
    readonly "cf.body.open": {
        readonly zh: "「{name}」本机还有未上传的改动。";
        readonly en: "“{name}” has changes on this device that were not uploaded yet.";
        readonly ja: "「{name}」にはまだアップロードしていない変更がこの端末にあります。";
    };
    readonly "cf.body.push": {
        readonly zh: "「{name}」在云端和本机各有一版新改动。";
        readonly en: "“{name}” has new changes both in the cloud and on this device.";
        readonly ja: "「{name}」はクラウドとこの端末の両方に新しい変更があります。";
    };
    readonly "cf.checkingCloud": {
        readonly zh: "检查云端";
        readonly en: "Checking cloud";
        readonly ja: "クラウドを確認中";
    };
    readonly "cf.cloudAccountInfo": {
        readonly zh: "云端：{who}";
        readonly en: "Cloud: {who}";
        readonly ja: "クラウド：{who}";
    };
    readonly "cf.cloudAccountOfflineInfo": {
        readonly zh: "云端：{who}（离线）";
        readonly en: "Cloud: {who} (offline)";
        readonly ja: "クラウド：{who}（オフライン）";
    };
    readonly "cf.cloudAccountOfflineTitle": {
        readonly zh: "云端：{who}（离线，无法推 / 拉）";
        readonly en: "Cloud: {who} (offline, cannot push / pull)";
        readonly ja: "クラウド：{who}（オフライン、push / pull 不可）";
    };
    readonly "cf.cloudAccountTitle": {
        readonly zh: "云端：{who}（点开账号菜单）";
        readonly en: "Cloud: {who} (tap to open account menu)";
        readonly ja: "クラウド：{who}（アカウントメニューを開く）";
    };
    readonly "cf.cloudNewerTitle": {
        readonly zh: "云端有新版本";
        readonly en: "A newer version exists in the cloud";
        readonly ja: "クラウドに新しいバージョンがあります";
    };
    readonly "cf.cloudNotConfigured": {
        readonly zh: "云端：未配置";
        readonly en: "Cloud: not configured";
        readonly ja: "クラウド：未設定";
    };
    readonly "cf.cloudNotSignedIn": {
        readonly zh: "云端：未登录";
        readonly en: "Cloud: not signed in";
        readonly ja: "クラウド：未ログイン";
    };
    readonly "cf.cloudNotSignedInTitle": {
        readonly zh: "云端：未登录（点开登录）";
        readonly en: "Cloud: not signed in (tap to sign in)";
        readonly ja: "クラウド：未ログイン（タップしてログイン）";
    };
    readonly "cf.cloudOffline": {
        readonly zh: "云端：离线";
        readonly en: "Cloud: offline";
        readonly ja: "クラウド：オフライン";
    };
    readonly "cf.note.keptSafe": {
        readonly zh: "被替换的版本会自动留底，不会丢失";
        readonly en: "The replaced version is kept automatically — nothing is lost";
        readonly ja: "置き換えられたバージョンは自動的に保管され、失われません";
    };
    readonly "cf.signedIn": {
        readonly zh: "已登录";
        readonly en: "Signed in";
        readonly ja: "ログイン済み";
    };
    readonly "cf.skipToOffline": {
        readonly zh: "跳过到离线";
        readonly en: "Skip to offline";
        readonly ja: "スキップしてオフライン";
    };
    readonly "common.cancel": {
        readonly zh: "取消";
        readonly en: "Cancel";
        readonly ja: "キャンセル";
    };
    readonly "cp.downloadFailed": {
        readonly zh: "拿不到 {name}（离线且本地无缓存？）";
        readonly en: "Could not fetch {name} (offline with no local copy?)";
        readonly ja: "{name} を取得できません（オフラインでローカルコピーなし？）";
    };
    readonly "cp.downloading": {
        readonly zh: "正在下载 {name}…";
        readonly en: "Downloading {name}…";
        readonly ja: "{name} をダウンロード中…";
    };
    readonly "cp.importFailed": {
        readonly zh: "云盘导入失败：{err}";
        readonly en: "Cloud import failed: {err}";
        readonly ja: "クラウドからの読み込みに失敗：{err}";
    };
    readonly "enc.confirmMsg": {
        readonly zh: "两次输入需一致";
        readonly en: "Both entries must match";
        readonly ja: "同じものを入力してください";
    };
    readonly "enc.confirmTitle": {
        readonly zh: "再输一遍确认";
        readonly en: "Confirm password";
        readonly ja: "もう一度入力して確認";
    };
    readonly "enc.enterGalleryPw": {
        readonly zh: "输入图库密码。密码只存在内存里，关页即忘。";
        readonly en: "Enter the gallery password. It lives only in memory and is forgotten when the page closes.";
        readonly ja: "ギャラリーのパスワードを入力。メモリにのみ保持され、ページを閉じると消えます。";
    };
    readonly "enc.enterPwMsg": {
        readonly zh: "图库已设过密码（跟账号走）。输入原密码；忘记 = 内容永久找不回。";
        readonly en: "This gallery already has a password (tied to your account). Enter it — if forgotten, the content is permanently unrecoverable.";
        readonly ja: "ギャラリーには既にパスワードが設定されています（アカウントに紐付き）。忘れた場合、内容は永久に復元できません。";
    };
    readonly "enc.enterPwTitle": {
        readonly zh: "输入图库密码";
        readonly en: "Enter gallery password";
        readonly ja: "ギャラリーパスワードを入力";
    };
    readonly "enc.importPrompt": {
        readonly zh: "这是加密文件。输入它的密码。";
        readonly en: "This file is encrypted. Enter its password.";
        readonly ja: "これは暗号化ファイルです。パスワードを入力してください。";
    };
    readonly "enc.locked.aria": {
        readonly zh: "已加密";
        readonly en: "Encrypted";
        readonly ja: "暗号化済み";
    };
    readonly "enc.setPwMismatch": {
        readonly zh: "两次输入不一致，重新设置";
        readonly en: "Entries don't match — try again";
        readonly ja: "入力が一致しません。やり直してください";
    };
    readonly "enc.setPwMsg": {
        readonly zh: "整个图库共用这一个密码。忘记 = 内容永久找不回（没有任何后门）；太短的密码可被暴力破解。加密文件用 7-Zip 输此密码也能打开。";
        readonly en: "One password for the whole gallery. If forgotten, content is permanently unrecoverable (there is no backdoor); short passwords can be brute-forced. Encrypted files also open in 7-Zip with this password.";
        readonly ja: "ギャラリー全体で1つのパスワードを共有します。忘れると内容は永久に復元できません（バックドアなし）。短いパスワードは総当たりに弱いです。暗号化ファイルは 7-Zip でも同じパスワードで開けます。";
    };
    readonly "enc.setPwTitle": {
        readonly zh: "设置图库密码";
        readonly en: "Set gallery password";
        readonly ja: "ギャラリーパスワードを設定";
    };
    readonly "enc.unlockImportTitle": {
        readonly zh: "解锁导入的加密文件";
        readonly en: "Unlock imported encrypted file";
        readonly ja: "インポートした暗号化ファイルのロック解除";
    };
    readonly "enc.unlockTitle": {
        readonly zh: "解锁加密作品";
        readonly en: "Unlock encrypted artwork";
        readonly ja: "暗号化作品のロック解除";
    };
    readonly "enc.wrongRetry": {
        readonly zh: "密码不对，再试一次";
        readonly en: "Wrong password — try again";
        readonly ja: "パスワードが違います。もう一度";
    };
    readonly "err.cloudNetwork": {
        readonly zh: "网络不通：暂时连不上云端。你的画都还在本地，稍后可重试。";
        readonly en: "Network unreachable: could not reach the cloud. Your work is safe locally — try again later.";
        readonly ja: "ネットワークに接続できません。作品はローカルに保存されています。後で再試行してください。";
    };
    readonly "gal.busy.copy": {
        readonly zh: "正在创建副本 {base}…";
        readonly en: "Duplicating {base}…";
        readonly ja: "複製中 {base}…";
    };
    readonly "gal.busy.del": {
        readonly zh: "正在删除 {name}…";
        readonly en: "Deleting {name}…";
        readonly ja: "削除中 {name}…";
    };
    readonly "gal.busy.emptyTrash": {
        readonly zh: "正在清空{label}回收站…";
        readonly en: "Emptying {label} trash…";
        readonly ja: "{label}のゴミ箱を空に…";
    };
    readonly "gal.busy.move": {
        readonly zh: "正在移动 {base} → {target}…";
        readonly en: "Moving {base} → {target}…";
        readonly ja: "移動中 {base} → {target}…";
    };
    readonly "gal.busy.purge": {
        readonly zh: "正在永久删除 {name}…";
        readonly en: "Deleting {name} forever…";
        readonly ja: "完全に削除中 {name}…";
    };
    readonly "gal.busy.rename": {
        readonly zh: "正在重命名 {name} → {to}…";
        readonly en: "Renaming {name} → {to}…";
        readonly ja: "名前変更中 {name} → {to}…";
    };
    readonly "gal.busy.restore": {
        readonly zh: "正在恢复 {name}…";
        readonly en: "Restoring {name}…";
        readonly ja: "復元中 {name}…";
    };
    readonly "gal.busy.reupload": {
        readonly zh: "重新上传中…";
        readonly en: "Re-uploading…";
        readonly ja: "再アップロード中…";
    };
    readonly "gal.copy": {
        readonly zh: "创建副本";
        readonly en: "Duplicate";
        readonly ja: "複製を作成";
    };
    readonly "gal.del.activeSuffix": {
        readonly zh: " 当前画布会关闭。";
        readonly en: " The current canvas will close.";
        readonly ja: " 現在のキャンバスは閉じられます。";
    };
    readonly "gal.del.cloudDetail": {
        readonly zh: "会进云端回收站，可恢复。";
        readonly en: "Goes to cloud trash; can be restored.";
        readonly ja: "クラウドのゴミ箱に入り、復元可能です。";
    };
    readonly "gal.del.dirtyDetail": {
        readonly zh: "本地有**未推送到云端的修改**，删除会丢这些改动。云端备份进回收站可恢复。";
        readonly en: "Local has **unpushed changes**; deleting loses them. The cloud backup goes to trash and can be restored.";
        readonly ja: "ローカルに**未送信の変更**があり、削除すると失われます。クラウドのバックアップはゴミ箱に入り復元可能です。";
    };
    readonly "gal.del.imageDetail": {
        readonly zh: "移到回收站（可恢复）。这是图片素材，不是画作。";
        readonly en: "Move to trash (recoverable). This is an image file, not an artwork.";
        readonly ja: "ゴミ箱へ移動（復元可）。これは画像ファイルで、作品ではありません。";
    };
    readonly "gal.del.localDetail": {
        readonly zh: "会进本地回收站，可恢复。";
        readonly en: "Goes to local trash; can be restored.";
        readonly ja: "ローカルのゴミ箱に入り、復元可能です。";
    };
    readonly "gal.del.syncedDetail": {
        readonly zh: "本地副本会一起删，云端进回收站可恢复。";
        readonly en: "The local copy is deleted too; the cloud copy goes to trash and can be restored.";
        readonly ja: "ローカルも削除され、クラウドはゴミ箱に入り復元可能です。";
    };
    readonly "gal.delEmptyFolder": {
        readonly zh: "删除空文件夹";
        readonly en: "Delete empty folder";
        readonly ja: "空のフォルダを削除";
    };
    readonly "gal.delFolderNonEmpty": {
        readonly zh: "删除（请先清空里面）";
        readonly en: "Delete (empty it first)";
        readonly ja: "削除（先に中を空に）";
    };
    readonly "gal.deleted": {
        readonly zh: "删除";
        readonly en: "deleted";
        readonly ja: "削除";
    };
    readonly "gal.discardToTrash": {
        readonly zh: "丢弃（送回收站）";
        readonly en: "Discard (to trash)";
        readonly ja: "破棄（ゴミ箱へ）";
    };
    readonly "gal.divergedNote": {
        readonly zh: "云端副本已被别的设备移动或删除；本地这份有未推送的修改。";
        readonly en: "The cloud copy was moved or deleted by another device; this local copy has unpushed changes.";
        readonly ja: "クラウド側は別端末で移動/削除されました。ローカルには未送信の変更があります。";
    };
    readonly "gal.dlg.decryptMsg": {
        readonly zh: "内容将以明文存放在本机与云端，任何能访问此设备或云账号的人都能查看。";
        readonly en: "Contents will be stored as plaintext locally and in the cloud; anyone with access to this device or cloud account can view them.";
        readonly ja: "内容はローカルとクラウドに平文で保存され、この端末やクラウドにアクセスできる人は誰でも閲覧できます。";
    };
    readonly "gal.dlg.decryptTitle": {
        readonly zh: "解除「{base}」的加密？";
        readonly en: "Decrypt “{base}”?";
        readonly ja: "「{base}」の暗号化を解除？";
    };
    readonly "gal.dlg.delTitle": {
        readonly zh: "删除 \"{name}\"？";
        readonly en: "Delete “{name}”?";
        readonly ja: "「{name}」を削除？";
    };
    readonly "gal.dlg.emptyTrashMsg": {
        readonly zh: "{label}回收站会被彻底清空，不可撤销。";
        readonly en: "The {label} trash will be permanently emptied. Cannot be undone.";
        readonly ja: "{label}のゴミ箱を完全に空にします。元に戻せません。";
    };
    readonly "gal.dlg.emptyTrashTitle": {
        readonly zh: "清空{label}回收站？";
        readonly en: "Empty {label} trash?";
        readonly ja: "{label}のゴミ箱を空に？";
    };
    readonly "gal.dlg.moveMsg": {
        readonly zh: "选择目标文件夹";
        readonly en: "Choose target folder";
        readonly ja: "移動先フォルダを選択";
    };
    readonly "gal.dlg.moveTitle": {
        readonly zh: "移动「{base}」到…";
        readonly en: "Move “{base}” to…";
        readonly ja: "「{base}」を移動…";
    };
    readonly "gal.dlg.purgeMsg": {
        readonly zh: "不可撤销。";
        readonly en: "Cannot be undone.";
        readonly ja: "元に戻せません。";
    };
    readonly "gal.dlg.purgeTitle": {
        readonly zh: "永久删除 \"{name}\"？";
        readonly en: "Delete “{name}” forever?";
        readonly ja: "「{name}」を完全に削除？";
    };
    readonly "gal.dlg.rename": {
        readonly zh: "重命名";
        readonly en: "Rename";
        readonly ja: "名前を変更";
    };
    readonly "gal.dlg.renameNote": {
        readonly zh: "重命名（{note}）";
        readonly en: "Rename ({note})";
        readonly ja: "名前を変更（{note}）";
    };
    readonly "gal.empty.folder": {
        readonly zh: "文件夹 \"{f}\" 是空的";
        readonly en: "Folder “{f}” is empty";
        readonly ja: "フォルダ「{f}」は空です";
    };
    readonly "gal.empty.none": {
        readonly zh: "还没有保存的作品。点右上加号新建一个，或先在 PC 上画一笔。";
        readonly en: "No saved artwork yet. Tap + at top-right to create one, or draw on PC first.";
        readonly ja: "保存された作品がありません。右上の＋で新規作成、またはPCで描いてください。";
    };
    readonly "gal.empty.trash": {
        readonly zh: "回收站是空的。";
        readonly en: "Trash is empty.";
        readonly ja: "ゴミ箱は空です。";
    };
    readonly "gal.emptyFolder": {
        readonly zh: "空文件夹";
        readonly en: "Empty folder";
        readonly ja: "空のフォルダ";
    };
    readonly "gal.firstFrameFailed": {
        readonly zh: "图库读取失败（详见诊断日志）";
        readonly en: "Gallery listing failed (see the diagnostic log)";
        readonly ja: "ギャラリーの読み込みに失敗しました（診断ログ参照）";
    };
    readonly "gal.firstFrameTimeout": {
        readonly zh: "图库读取超时：本地存储没有响应";
        readonly en: "Gallery listing timed out: local storage did not respond";
        readonly ja: "ギャラリーの読み込みがタイムアウトしました：ローカルストレージが応答しません";
    };
    readonly "gal.folder": {
        readonly zh: "文件夹";
        readonly en: "Folder";
        readonly ja: "フォルダ";
    };
    readonly "gal.imageFile": {
        readonly zh: "图片";
        readonly en: "Image";
        readonly ja: "画像";
    };
    readonly "gal.loading": {
        readonly zh: "加载中…";
        readonly en: "Loading…";
        readonly ja: "読み込み中…";
    };
    readonly "gal.loc.cloud": {
        readonly zh: "云端";
        readonly en: "Cloud";
        readonly ja: "クラウド";
    };
    readonly "gal.loc.local": {
        readonly zh: "本地";
        readonly en: "Local";
        readonly ja: "ローカル";
    };
    readonly "gal.lockedThumb": {
        readonly zh: "已加密 —— 点锁解锁预览";
        readonly en: "Encrypted — tap lock to unlock preview";
        readonly ja: "暗号化済み — ロックをタップしてプレビュー";
    };
    readonly "gal.tile.active": {
        readonly zh: "编辑中";
        readonly en: "Editing";
        readonly ja: "編集中";
    };
    readonly "gal.more": {
        readonly zh: "更多操作";
        readonly en: "More actions";
        readonly ja: "その他の操作";
    };
    readonly "gal.moveTo": {
        readonly zh: "移动到…";
        readonly en: "Move to…";
        readonly ja: "移動…";
    };
    readonly "gal.note.empty": {
        readonly zh: "名字不能空";
        readonly en: "Name can’t be empty";
        readonly ja: "名前は空にできません";
    };
    readonly "gal.note.fail": {
        readonly zh: "失败：{e}";
        readonly en: "Failed: {e}";
        readonly ja: "失敗：{e}";
    };
    readonly "gal.note.taken": {
        readonly zh: "{loc}已有同名，换一个";
        readonly en: "{loc} already has this name, pick another";
        readonly ja: "{loc}に同名あり、別名に";
    };
    readonly "gal.openDiag": {
        readonly zh: "诊断日志";
        readonly en: "Diagnostic log";
        readonly ja: "診断ログ";
    };
    readonly "gal.otherFile": {
        readonly zh: "文件（在 WeebPaint 外管理）";
        readonly en: "File (managed outside WeebPaint)";
        readonly ja: "ファイル（WeebPaint 外で管理）";
    };
    readonly "gal.ph.newName": {
        readonly zh: "新名字";
        readonly en: "New name";
        readonly ja: "新しい名前";
    };
    readonly "gal.pullLocal": {
        readonly zh: "拉取到本地";
        readonly en: "Pull to local";
        readonly ja: "ローカルに取得";
    };
    readonly "gal.purge": {
        readonly zh: "永久删除";
        readonly en: "Delete forever";
        readonly ja: "完全に削除";
    };
    readonly "gal.pushCloud": {
        readonly zh: "推送到云端";
        readonly en: "Push to cloud";
        readonly ja: "クラウドに送信";
    };
    readonly "gal.reload": {
        readonly zh: "重新载入应用";
        readonly en: "Reload app";
        readonly ja: "アプリを再読み込み";
    };
    readonly "gal.rename": {
        readonly zh: "重命名";
        readonly en: "Rename";
        readonly ja: "名前を変更";
    };
    readonly "gal.renameKeep": {
        readonly zh: "重命名留存";
        readonly en: "Rename & keep";
        readonly ja: "名前を変えて保持";
    };
    readonly "gal.restore": {
        readonly zh: "恢复";
        readonly en: "Restore";
        readonly ja: "復元";
    };
    readonly "gal.retry": {
        readonly zh: "重试";
        readonly en: "Retry";
        readonly ja: "再試行";
    };
    readonly "gal.reupload": {
        readonly zh: "重新上传";
        readonly en: "Re-upload";
        readonly ja: "再アップロード";
    };
    readonly "gal.root": {
        readonly zh: "根目录";
        readonly en: "root";
        readonly ja: "ルート";
    };
    readonly "gal.rootFolder": {
        readonly zh: "/ 根目录";
        readonly en: "/ root";
        readonly ja: "/ ルート";
    };
    readonly "gal.scope.both": {
        readonly zh: "本地和云端";
        readonly en: "local and cloud";
        readonly ja: "ローカルとクラウド";
    };
    readonly "gal.scope.cloud": {
        readonly zh: "云端";
        readonly en: "cloud";
        readonly ja: "クラウド";
    };
    readonly "gal.scope.local": {
        readonly zh: "本地";
        readonly en: "local";
        readonly ja: "ローカル";
    };
    readonly "gal.st.alreadyEnc": {
        readonly zh: "已是加密作品";
        readonly en: "Already encrypted";
        readonly ja: "既に暗号化済みです";
    };
    readonly "gal.st.alreadyInFolder": {
        readonly zh: "已在该文件夹";
        readonly en: "Already in that folder";
        readonly ja: "既にそのフォルダ内です";
    };
    readonly "gal.st.cancelled": {
        readonly zh: "已取消";
        readonly en: "Cancelled";
        readonly ja: "キャンセルしました";
    };
    readonly "gal.st.cancelledPw": {
        readonly zh: "已取消（需要密码）";
        readonly en: "Cancelled (password required)";
        readonly ja: "キャンセル（パスワードが必要）";
    };
    readonly "gal.st.cloudPullFirst": {
        readonly zh: "纯云端作品先拉取到本地再{verb}";
        readonly en: "Pull the cloud-only artwork to local first to {verb}";
        readonly ja: "クラウドのみの作品は先にローカルへ取得してから{verb}";
    };
    readonly "gal.st.copied": {
        readonly zh: "已创建副本：{name}";
        readonly en: "Duplicated: {name}";
        readonly ja: "複製：{name}";
    };
    readonly "gal.st.copyFail": {
        readonly zh: "创建副本失败：{e}";
        readonly en: "Duplicate failed: {e}";
        readonly ja: "複製失敗：{e}";
    };
    readonly "gal.st.copyNoBytes": {
        readonly zh: "找不到源作品的字节，复制失败";
        readonly en: "Source artwork bytes not found; duplicate failed";
        readonly ja: "元作品のデータが見つからず複製失敗";
    };
    readonly "gal.st.decryptFail": {
        readonly zh: "解除加密失败：{e}";
        readonly en: "Decryption failed: {e}";
        readonly ja: "暗号化解除失敗：{e}";
    };
    readonly "gal.st.decrypted": {
        readonly zh: "已解除加密：{name}";
        readonly en: "Decrypted: {name}";
        readonly ja: "暗号化解除：{name}";
    };
    readonly "gal.st.delCancelled": {
        readonly zh: "已取消，没有删除「{name}」";
        readonly en: "Cancelled — \"{name}\" was not deleted";
        readonly ja: "キャンセルしました。「{name}」は削除していません";
    };
    readonly "gal.st.delFail": {
        readonly zh: "删除失败：{e}";
        readonly en: "Delete failed: {e}";
        readonly ja: "削除失敗：{e}";
    };
    readonly "gal.st.delLocalOnly": {
        readonly zh: "「{name}」已从本地移入回收站，但云端那份还在（离线或来历不明，没敢删）";
        readonly en: "\"{name}\" was moved to the local recycle bin, but the cloud copy remains (offline or unknown lineage)";
        readonly ja: "「{name}」をローカルのごみ箱に移動しましたが、クラウド側は残っています（オフラインまたは由来不明）";
    };
    readonly "gal.st.delNothing": {
        readonly zh: "「{name}」本地和云端都没有，无事可删";
        readonly en: "\"{name}\" exists neither locally nor in the cloud — nothing to delete";
        readonly ja: "「{name}」はローカルにもクラウドにも存在しません";
    };
    readonly "gal.st.deleted": {
        readonly zh: "已删除：{name}";
        readonly en: "Deleted: {name}";
        readonly ja: "削除：{name}";
    };
    readonly "gal.st.emptyTrashCloudFail": {
        readonly zh: "{n} 项云端没清（可能离线），回线再清";
        readonly en: "{n} cloud item(s) not cleared (maybe offline); retry when online";
        readonly ja: "{n} 件がクラウドで未削除（オフライン？）。オンライン復帰後に再試行";
    };
    readonly "gal.st.emptyTrashCloudNeedLogin": {
        readonly zh: "清空云端回收站需先登录并联网";
        readonly en: "Emptying cloud trash requires sign-in and network";
        readonly ja: "クラウドのゴミ箱を空にするにはサインインと接続が必要です";
    };
    readonly "gal.st.emptyTrashDone": {
        readonly zh: "已清空{label}回收站";
        readonly en: "Emptied {label} trash";
        readonly ja: "{label}のゴミ箱を空にしました";
    };
    readonly "gal.st.emptyTrashPartial": {
        readonly zh: "清空时部分失败";
        readonly en: "Some items failed to clear";
        readonly ja: "一部の削除に失敗しました";
    };
    readonly "gal.st.encConflict": {
        readonly zh: "云端有更新版本：{name} —— 本地已换、已标未推送；打开后按冲突流程处理";
        readonly en: "Newer version in cloud: {name} — local swapped and marked unpushed; resolve conflict after opening";
        readonly ja: "クラウドに新しい版：{name} — ローカルは変更・未送信済み。開いてから競合を解決";
    };
    readonly "gal.st.encDeferred": {
        readonly zh: "{okMsg}（本地完成；云端暂未跟上，已标未推送，回线后推送即同步）";
        readonly en: "{okMsg} (local done; cloud not yet, marked unpushed; push when back online)";
        readonly ja: "{okMsg}（ローカル完了；クラウド未追従、未送信。オンライン復帰後に送信で同期）";
    };
    readonly "gal.st.encFail": {
        readonly zh: "加密失败：{e}";
        readonly en: "Encryption failed: {e}";
        readonly ja: "暗号化失敗：{e}";
    };
    readonly "gal.st.encNeedOnline": {
        readonly zh: "已同步过云端的作品需在线操作（本地与云端要一起换）";
        readonly en: "Cloud-synced artwork needs to be online (local and cloud swap together)";
        readonly ja: "クラウド同期済みの作品はオンラインで操作（ローカルとクラウドを同時に）";
    };
    readonly "gal.st.encryptedOk": {
        readonly zh: "已加密：{name}（7-Zip 输此密码可恢复；忘记密码内容永久找不回）";
        readonly en: "Encrypted: {name} (7-Zip with this password can recover; forgotten password = permanently lost)";
        readonly ja: "暗号化：{name}（このパスワードで7-Zip復元可；忘れると内容は永久に失われます）";
    };
    readonly "gal.st.folderDelFail": {
        readonly zh: "删除文件夹失败：{e}";
        readonly en: "Folder delete failed: {e}";
        readonly ja: "フォルダ削除失敗：{e}";
    };
    readonly "gal.st.folderDeleted": {
        readonly zh: "已删除空文件夹：{name}";
        readonly en: "Deleted empty folder: {name}";
        readonly ja: "空のフォルダを削除：{name}";
    };
    readonly "gal.st.moveFail": {
        readonly zh: "移动失败：{e}";
        readonly en: "Move failed: {e}";
        readonly ja: "移動失敗：{e}";
    };
    readonly "gal.st.moved": {
        readonly zh: "已移动到：{target}";
        readonly en: "Moved to: {target}";
        readonly ja: "移動先：{target}";
    };
    readonly "gal.st.nameTakenTarget": {
        readonly zh: "{loc}目标已有同名「{base}」";
        readonly en: "{loc} target already has “{base}”";
        readonly ja: "{loc}の移動先に同名「{base}」あり";
    };
    readonly "gal.st.nameUnchanged": {
        readonly zh: "名字未变";
        readonly en: "Name unchanged";
        readonly ja: "名前は変わっていません";
    };
    readonly "gal.st.noLocalBytes": {
        readonly zh: "本地字节缺失";
        readonly en: "Local bytes missing";
        readonly ja: "ローカルデータがありません";
    };
    readonly "gal.st.noOtherFolder": {
        readonly zh: "没有别的文件夹可移（先新建一个）";
        readonly en: "No other folder to move to (create one first)";
        readonly ja: "移動先のフォルダがありません（先に作成）";
    };
    readonly "gal.st.notEnc": {
        readonly zh: "这不是加密作品";
        readonly en: "This artwork isn’t encrypted";
        readonly ja: "これは暗号化作品ではありません";
    };
    readonly "gal.st.openActive": {
        readonly zh: "这画正开着 —— 先退出到图库再{verb}";
        readonly en: "This artwork is open — exit to gallery first to {verb}";
        readonly ja: "この作品は開いています — 先にギャラリーに戻って{verb}";
    };
    readonly "gal.st.purgeFail": {
        readonly zh: "永久删除失败：{e}";
        readonly en: "Permanent delete failed: {e}";
        readonly ja: "完全削除失敗：{e}";
    };
    readonly "gal.st.purged": {
        readonly zh: "已永久删除：{name}";
        readonly en: "Permanently deleted: {name}";
        readonly ja: "完全に削除：{name}";
    };
    readonly "gal.st.renamed": {
        readonly zh: "已重命名：{to}";
        readonly en: "Renamed: {to}";
        readonly ja: "名前変更：{to}";
    };
    readonly "gal.st.renamed2": {
        readonly zh: "已重命名：{from} → {to}";
        readonly en: "Renamed: {from} → {to}";
        readonly ja: "名前変更：{from} → {to}";
    };
    readonly "gal.st.restoreFail": {
        readonly zh: "恢复失败：{e}";
        readonly en: "Restore failed: {e}";
        readonly ja: "復元失敗：{e}";
    };
    readonly "gal.st.restored": {
        readonly zh: "已恢复：{name}";
        readonly en: "Restored: {name}";
        readonly ja: "復元：{name}";
    };
    readonly "gal.st.restoredRenamed": {
        readonly zh: "已恢复：{name}（原名 {orig} 已被占用）";
        readonly en: "Restored: {name} (original name {orig} was taken)";
        readonly ja: "復元：{name}（元の名前 {orig} は使用中）";
    };
    readonly "gal.st.reuploadConflict": {
        readonly zh: "云端已存在同名文件，未覆盖：{name}（请改名或从云端拉取）";
        readonly en: "A file with that name already exists on cloud; not overwritten: {name}";
        readonly ja: "クラウドに同名ファイルが既に存在します。上書きしません：{name}";
    };
    readonly "gal.st.reuploadFail": {
        readonly zh: "重新上传失败：{e}";
        readonly en: "Re-upload failed: {e}";
        readonly ja: "再アップロード失敗：{e}";
    };
    readonly "gal.st.reuploaded": {
        readonly zh: "已重新上传：{name}";
        readonly en: "Re-uploaded: {name}";
        readonly ja: "再アップロード完了：{name}";
    };
    readonly "gal.st.unlocked": {
        readonly zh: "已解锁加密作品（密码只在内存，关页即忘）";
        readonly en: "Unlocked (password kept in memory only, forgotten on close)";
        readonly ja: "ロック解除（パスワードはメモリのみ、閉じると破棄）";
    };
    readonly "gal.toTrash": {
        readonly zh: "送到回收站";
        readonly en: "Move to trash";
        readonly ja: "ゴミ箱へ";
    };
    readonly "gal.unloadLocal": {
        readonly zh: "卸载本地";
        readonly en: "Unload local";
        readonly ja: "ローカルを解放";
    };
    readonly "gal.verb.decrypt": {
        readonly zh: "解除加密";
        readonly en: "decrypt";
        readonly ja: "暗号化解除";
    };
    readonly "gal.verb.encrypt": {
        readonly zh: "加密";
        readonly en: "encrypt";
        readonly ja: "暗号化";
    };
    readonly "gc.redirectReadyMsg": {
        readonly zh: "已保存到本机。接下来会跳到微软登录页，登录后自动回来。";
        readonly en: "Saved on this device. Next you'll go to the Microsoft sign-in page and come back automatically.";
        readonly ja: "この端末に保存しました。次に Microsoft のサインインページへ移動し、サインイン後に自動で戻ります。";
    };
    readonly "gm.alreadyCurrent": {
        readonly zh: "已经是当前图库";
        readonly en: "Already the current gallery";
        readonly ja: "すでに現在のギャラリーです";
    };
    readonly "gm.backupDone": {
        readonly zh: "已下载 {n} 份备份";
        readonly en: "Downloaded {n} backups";
        readonly ja: "バックアップを {n} 件ダウンロードしました";
    };
    readonly "gm.closeDocFirst": {
        readonly zh: "先关闭当前画，再切换或卸下图库";
        readonly en: "Close the current painting before switching or detaching the gallery";
        readonly ja: "ギャラリーを切り替える前に、現在の絵を閉じてください";
    };
    readonly "gm.connectFolder": {
        readonly zh: "连接本地文件夹…";
        readonly en: "Connect local folder…";
        readonly ja: "ローカルフォルダーを接続…";
    };
    readonly "gm.connectOneDrive": {
        readonly zh: "连接 OneDrive…";
        readonly en: "Connect OneDrive…";
        readonly ja: "OneDrive を接続…";
    };
    readonly "gm.connectTitle": {
        readonly zh: "连接图库";
        readonly en: "Connect a gallery";
        readonly ja: "ギャラリーを接続";
    };
    readonly "gm.current": {
        readonly zh: "当前图库：{label}（{src}）";
        readonly en: "Current gallery: {label} ({src})";
        readonly ja: "現在のギャラリー：{label}（{src}）";
    };
    readonly "gm.dirtyAllPushed": {
        readonly zh: "已全部上传，继续切换";
        readonly en: "All uploaded — continuing";
        readonly ja: "すべてアップロードしました。続行します";
    };
    readonly "gm.dirtyBackup": {
        readonly zh: "下载备份";
        readonly en: "Download backups";
        readonly ja: "バックアップをダウンロード";
    };
    readonly "gm.dirtyForce": {
        readonly zh: "仍要切换";
        readonly en: "Switch anyway";
        readonly ja: "それでも切り替える";
    };
    readonly "gm.dirtyMsg": {
        readonly zh: "切换后它们留在本机缓存，回到此图库时继续上传。注意：浏览器可能清除本机缓存，缓存不是保险箱——建议先下载备份。";
        readonly en: "They stay in this device's cache and upload when you return. Note: the browser may evict local cache — it is not a safe. Consider downloading backups first.";
        readonly ja: "この端末のキャッシュに残り、戻ったときにアップロードされます。注意：ブラウザはキャッシュを削除することがあります。先にバックアップのダウンロードをおすすめします。";
    };
    readonly "gm.dirtyTitle": {
        readonly zh: "有 {n} 张画未上云";
        readonly en: "{n} paintings not yet uploaded";
        readonly ja: "未アップロードの絵が {n} 枚あります";
    };
    readonly "gm.disconnected": {
        readonly zh: "已断开图库连接（画布与图库文件不受影响）";
        readonly en: "Gallery disconnected (canvas and gallery files untouched)";
        readonly ja: "ギャラリーの接続を解除しました（キャンバスとファイルはそのまま）";
    };
    readonly "gm.dismiss": {
        readonly zh: "关闭";
        readonly en: "Dismiss";
        readonly ja: "閉じる";
    };
    readonly "gm.fileProtoCloudHelp": {
        readonly zh: "单文件直接双击打开（file://）时，微软登录用不了——需要一个本地 http 环境。逃生舱：在这个文件所在的文件夹打开命令行，运行\n\n    python -m http.server 8000\n\n然后用浏览器打开 http://localhost:8000/{file} 再连接 OneDrive。（本地文件夹图库不受影响，可以直接用。）";
        readonly en: "Opened directly from disk (file://), Microsoft sign-in cannot work — it needs a local http origin. Escape hatch: open a terminal in this file's folder and run\n\n    python -m http.server 8000\n\nthen open http://localhost:8000/{file} in your browser and connect OneDrive there. (Local folder galleries are unaffected.)";
        readonly ja: "ファイルを直接開いた状態（file://）では Microsoft サインインは使えません——ローカル http 環境が必要です。このファイルのフォルダーでターミナルを開き、\n\n    python -m http.server 8000\n\nを実行し、ブラウザで http://localhost:8000/{file} を開いてから OneDrive に接続してください。（ローカルフォルダーのギャラリーはそのまま使えます。）";
    };
    readonly "gm.forgetDirtyWarn": {
        readonly zh: "⚠ 该图库还有 {n} 张画未上云（缓存留在本机，重新连接后可继续上传）。";
        readonly en: "⚠ {n} paintings in that gallery are not yet uploaded (cache stays on this device; reconnect later to resume uploading).";
        readonly ja: "⚠ そのギャラリーには未アップロードの絵が {n} 枚あります（キャッシュは端末に残り、再接続で再開できます）。";
    };
    readonly "gm.forgetHint": {
        readonly zh: "忘记（不动文件）";
        readonly en: "Forget (files untouched)";
        readonly ja: "一覧から削除（ファイルはそのまま）";
    };
    readonly "gm.forgetMsg": {
        readonly zh: "只从这台设备的名册移除，不动图库本身的文件。";
        readonly en: "Removes it from this device's list only; gallery files are untouched.";
        readonly ja: "この端末の一覧から削除するだけで、ギャラリーのファイルには触れません。";
    };
    readonly "gm.forgetTitle": {
        readonly zh: "忘记「{label}」？";
        readonly en: "Forget \"{label}\"?";
        readonly ja: "「{label}」を一覧から削除しますか？";
    };
    readonly "gm.forgotten": {
        readonly zh: "已忘记 {label}";
        readonly en: "Forgot {label}";
        readonly ja: "{label} を一覧から削除しました";
    };
    readonly "gm.historyCaption": {
        readonly zh: "最近连接过的：";
        readonly en: "Recently connected:";
        readonly ja: "最近接続したもの：";
    };
    readonly "gm.offlineBanner": {
        readonly zh: "图库「{label}」已离线——画照常，同步暂停";
        readonly en: "Gallery \"{label}\" is offline — keep painting, sync paused";
        readonly ja: "ギャラリー「{label}」はオフライン——描画は通常どおり、同期は一時停止";
    };
    readonly "gm.offlineSuffix": {
        readonly zh: " · 已离线";
        readonly en: " · offline";
        readonly ja: " · オフライン";
    };
    readonly "gm.reconnect": {
        readonly zh: "重新连接";
        readonly en: "Reconnect";
        readonly ja: "再接続";
    };
    readonly "gm.reconnected": {
        readonly zh: "已重新连接";
        readonly en: "Reconnected";
        readonly ja: "再接続しました";
    };
    readonly "gm.seedFresh": {
        readonly zh: "出厂全新";
        readonly en: "Factory fresh";
        readonly ja: "新規（デフォルト）";
    };
    readonly "gm.seedInherit": {
        readonly zh: "继承当前笔刷与设置";
        readonly en: "Inherit current brushes & settings";
        readonly ja: "現在のブラシと設定を引き継ぐ";
    };
    readonly "gm.seedMsg": {
        readonly zh: "「继承」拷贝一份当前笔刷与设置，此后各自独立；「出厂全新」从内置默认起步。";
        readonly en: "\"Inherit\" copies your current brushes & settings (independent afterwards); \"factory fresh\" starts from built-in defaults.";
        readonly ja: "「引き継ぐ」は現在のブラシと設定をコピー（以後は独立）。「新規」は内蔵デフォルトから始めます。";
    };
    readonly "gm.seedTitle": {
        readonly zh: "新图库的笔刷与设置";
        readonly en: "Brushes & settings for the new gallery";
        readonly ja: "新しいギャラリーのブラシと設定";
    };
    readonly "gm.srcFolder": {
        readonly zh: "本地文件夹";
        readonly en: "Local folder";
        readonly ja: "ローカルフォルダー";
    };
    readonly "gm.srcOneDrive": {
        readonly zh: "OneDrive";
        readonly en: "OneDrive";
        readonly ja: "OneDrive";
    };
    readonly "gm.switchEntry": {
        readonly zh: "切换图库…";
        readonly en: "Switch gallery…";
        readonly ja: "ギャラリーを切り替え…";
    };
    readonly "gm.switched": {
        readonly zh: "已切换到 {label}";
        readonly en: "Switched to {label}";
        readonly ja: "{label} に切り替えました";
    };
    readonly "gm.transientAdopted": {
        readonly zh: "已连接图库，这幅画已自动保存为「{name}」";
        readonly en: "Gallery connected — this artwork was saved as \"{name}\"";
        readonly ja: "ギャラリーに接続しました。この作品は「{name}」として保存されました";
    };
    readonly "gs.changePwBusy": {
        readonly zh: "正在更改密码 {n}/{total}…";
        readonly en: "Changing password {n}/{total}…";
        readonly ja: "パスワード変更中 {n}/{total}…";
    };
    readonly "gs.changePwConfirmMsg": {
        readonly zh: "本机有字节的加密作品会用新密码重封（云端只见密文）。云端未缓存、离线或失败的作品仍用旧密码，打开时会单独问。";
        readonly en: "Encrypted artworks cached here are re-sealed with the new password (the cloud only ever sees ciphertext). Artworks not cached, offline, or failing stay on the old password and will ask for it when opened.";
        readonly ja: "この端末にある暗号化作品を新しいパスワードで再封印します（クラウドには暗号文しか渡りません）。未キャッシュ・オフライン・失敗した作品は旧パスワードのままで、開くときに聞かれます。";
    };
    readonly "gs.changePwConfirmTitle": {
        readonly zh: "更改密码？";
        readonly en: "Change password?";
        readonly ja: "パスワードを変更しますか？";
    };
    readonly "gs.changePwDone": {
        readonly zh: "密码已更改：{n} 件已用新密码重封";
        readonly en: "Password changed: {n} re-sealed";
        readonly ja: "パスワードを変更しました：{n} 件を再封印";
    };
    readonly "gs.changePwDoneKept": {
        readonly zh: "密码已更改：{n} 件已重封，{m} 件仍用旧密码（{k} 个文件夹清单不完整）";
        readonly en: "Password changed: {n} re-sealed, {m} still on the old password ({k} folders listed incompletely)";
        readonly ja: "パスワードを変更：{n} 件を再封印、{m} 件は旧パスワードのまま（{k} フォルダは一覧が不完全）";
    };
    readonly "gs.changePwNewMsg": {
        readonly zh: "输入新密码。本机有字节的加密作品会逐件用新密码重封，不经明文。";
        readonly en: "Enter the new password. Encrypted artworks cached on this device are re-sealed one by one, never through plaintext.";
        readonly ja: "新しいパスワードを入力。この端末にある暗号化作品を、平文を経ずに順に再封印します。";
    };
    readonly "gs.changePwNoVerifier": {
        readonly zh: "还没设过图库密码；第一次加密作品时会设置。";
        readonly en: "No gallery password yet — you set it when you first encrypt an artwork.";
        readonly ja: "まだギャラリーのパスワードがありません。作品を初めて暗号化するときに設定します。";
    };
    readonly "gs.changePwOldMsg": {
        readonly zh: "先验证当前的图库密码。";
        readonly en: "Verify the current gallery password first.";
        readonly ja: "まず現在のギャラリーのパスワードを確認します。";
    };
    readonly "gs.changePwOldTitle": {
        readonly zh: "输入当前密码";
        readonly en: "Enter current password";
        readonly ja: "現在のパスワードを入力";
    };
    readonly "gs.changePwSame": {
        readonly zh: "新密码与当前密码相同，没有更改。";
        readonly en: "Same as the current password — nothing changed.";
        readonly ja: "現在のパスワードと同じです。変更はありません。";
    };
    readonly "gs.changePwScanning": {
        readonly zh: "正在清点加密作品…";
        readonly en: "Listing encrypted artworks…";
        readonly ja: "暗号化作品を確認中…";
    };
    readonly "gs.clipboardNewFailed": {
        readonly zh: "从剪切板新建失败：{err}";
        readonly en: "Failed to create from clipboard: {err}";
        readonly ja: "クリップボードからの新規作成に失敗しました：{err}";
    };
    readonly "gs.clipboardNoImage": {
        readonly zh: "剪贴板里没有图片";
        readonly en: "No image in the clipboard";
        readonly ja: "クリップボードに画像がありません";
    };
    readonly "gs.cloudDisabledNoGallery": {
        readonly zh: "云端功能已停用，图库不可用（可在设置里重新开启）";
        readonly en: "Cloud features are disabled; the gallery is unavailable (re-enable in settings)";
        readonly ja: "クラウド機能が無効のため、ギャラリーは利用できません（設定で再度有効化できます）";
    };
    readonly "gs.created": {
        readonly zh: "新建：{name}（{w}×{h}）";
        readonly en: "Created: {name} ({w}×{h})";
        readonly ja: "新規作成：{name}（{w}×{h}）";
    };
    readonly "gs.createdTransient": {
        readonly zh: "已新建画布 {w}×{h}（未保存·无家——保存时选择去处）";
        readonly en: "New canvas {w}×{h} (unsaved, no home — choose where to save it later)";
        readonly ja: "新しいキャンバス {w}×{h}（未保存・保存時に保存先を選択）";
    };
    readonly "gs.creatingFolder": {
        readonly zh: "正在创建文件夹 {name}…";
        readonly en: "Creating folder {name}…";
        readonly ja: "フォルダ {name} を作成中…";
    };
    readonly "gs.folderCreateFailed": {
        readonly zh: "建文件夹失败：{err}";
        readonly en: "Failed to create folder: {err}";
        readonly ja: "フォルダの作成に失敗しました：{err}";
    };
    readonly "gs.folderCreated": {
        readonly zh: "已建文件夹：{name}";
        readonly en: "Folder created: {name}";
        readonly ja: "フォルダを作成しました：{name}";
    };
    readonly "gs.folderExists": {
        readonly zh: "文件夹 \"{name}\" 已存在";
        readonly en: "Folder \"{name}\" already exists";
        readonly ja: "フォルダ「{name}」は既に存在します";
    };
    readonly "gs.folderNameEmpty": {
        readonly zh: "文件夹名不能空";
        readonly en: "Folder name cannot be empty";
        readonly ja: "フォルダ名を空にできません";
    };
    readonly "gs.folderNameNoSlash": {
        readonly zh: "文件夹名不能含 /（要建嵌套请进对应文件夹再点新建）";
        readonly en: "Folder name cannot contain / (to nest, enter the target folder first, then create)";
        readonly ja: "フォルダ名に / を含められません（入れ子を作るには対象フォルダに入ってから作成してください）";
    };
    readonly "gs.folderNamePlaceholder": {
        readonly zh: "文件夹名";
        readonly en: "Folder name";
        readonly ja: "フォルダ名";
    };
    readonly "gs.folderNeedSignin": {
        readonly zh: "图库离线（未登录或权限失效），无法新建文件夹";
        readonly en: "Gallery is offline (not signed in / permission lost) — can't create a folder";
        readonly ja: "ギャラリーがオフライン（未ログイン／権限切れ）のためフォルダを作成できません";
    };
    readonly "gs.footUsage": {
        readonly zh: "作品占用：{size}（{count} 件）";
        readonly en: "Artwork usage: {size} ({count} items)";
        readonly ja: "作品の使用量：{size}（{count} 件）";
    };
    readonly "gs.footUsageTitle": {
        readonly zh: "浏览器分配上限约 {size}；当前 {pct}% 已用（含 SW 缓存等）";
        readonly en: "Browser allocation cap ~{size}; {pct}% used now (incl. SW cache, etc.)";
        readonly ja: "ブラウザ割り当て上限は約 {size}；現在 {pct}% 使用中（SW キャッシュ等を含む）";
    };
    readonly "gs.lockLabel": {
        readonly zh: "锁定加密作品（忘掉密码）";
        readonly en: "Lock encrypted works (forget password)";
        readonly ja: "暗号化作品をロック（パスワードを破棄）";
    };
    readonly "gs.locked": {
        readonly zh: "已锁定加密作品（密码已从内存清除）";
        readonly en: "Encrypted works locked (password cleared from memory)";
        readonly ja: "暗号化作品をロックしました（パスワードをメモリから消去）";
    };
    readonly "gs.newFolderDefault": {
        readonly zh: "新文件夹";
        readonly en: "New folder";
        readonly ja: "新しいフォルダ";
    };
    readonly "gs.newFolderTitle": {
        readonly zh: "新建文件夹";
        readonly en: "New folder";
        readonly ja: "新しいフォルダ";
    };
    readonly "gs.pwRecorded": {
        readonly zh: "已记下密码（打开加密作品时验证）";
        readonly en: "Password recorded (verified when opening an encrypted work)";
        readonly ja: "パスワードを記録しました（暗号化作品を開くときに検証）";
    };
    readonly "gs.pwResetDone": {
        readonly zh: "已重置。下次加密时设置新密码";
        readonly en: "Reset done. Set a new password next time you encrypt";
        readonly ja: "リセットしました。次回の暗号化時に新パスワードを設定します";
    };
    readonly "gs.pwWrongRetry": {
        readonly zh: "密码不对，再试一次";
        readonly en: "Wrong password, try again";
        readonly ja: "パスワードが違います。もう一度";
    };
    readonly "gs.quotaCritical": {
        readonly zh: "本地存储 {pct}% 已满 — 立即去图库卸载不常用的作品";
        readonly en: "Local storage {pct}% full — go to the gallery now and offload works you rarely use";
        readonly ja: "ローカルストレージが {pct}% 使用済み — 今すぐギャラリーで使わない作品を退避してください";
    };
    readonly "gs.quotaWarn": {
        readonly zh: "本地存储 {pct}% 已用 — 建议在图库整理";
        readonly en: "Local storage {pct}% used — consider tidying up in the gallery";
        readonly ja: "ローカルストレージが {pct}% 使用済み — ギャラリーで整理することをおすすめします";
    };
    readonly "gs.resetPwMsg": {
        readonly zh: "重置后下次加密可设新密码；但已有加密作品仍是旧密码，无法用新密码解锁。确定重置？";
        readonly en: "After reset you can set a new password for future encryption; existing encrypted works keep the old password and cannot be unlocked with the new one. Reset?";
        readonly ja: "リセット後は新しいパスワードを設定できますが、既存の暗号化作品は旧パスワードのままです。リセットしますか？";
    };
    readonly "gs.resetPwTitle": {
        readonly zh: "重置图库密码？";
        readonly en: "Reset gallery password?";
        readonly ja: "ギャラリーパスワードをリセット？";
    };
    readonly "gs.unlockLabel": {
        readonly zh: "解锁加密作品…";
        readonly en: "Unlock encrypted works…";
        readonly ja: "暗号化作品のロック解除…";
    };
    readonly "gs.unlockNoLocalMsg": {
        readonly zh: "本地暂无加密作品可验证——密码先收下，用到时自动验证";
        readonly en: "No local encrypted work to verify against — the password is saved for now and verified automatically when needed";
        readonly ja: "ローカルに検証できる暗号化作品がありません——パスワードは先に保存し、使用時に自動で検証します";
    };
    readonly "gs.unlockTitle": {
        readonly zh: "解锁加密作品";
        readonly en: "Unlock encrypted works";
        readonly ja: "暗号化作品のロック解除";
    };
    readonly "gs.unlockVerifierMsg": {
        readonly zh: "输入图库密码（跟账号走）。忘记 = 内容永久找不回，没有后门";
        readonly en: "Enter the gallery password (tied to your account). If forgotten, content is unrecoverable — there is no backdoor";
        readonly ja: "ギャラリーのパスワードを入力（アカウントに紐づく）。忘れた場合、内容は復元できません";
    };
    readonly "gs.unlocked": {
        readonly zh: "已解锁加密作品（密码只在内存，关页即忘）";
        readonly en: "Encrypted works unlocked (password stays in memory only, forgotten on page close)";
        readonly ja: "暗号化作品のロックを解除しました（パスワードはメモリのみ、ページを閉じると消去）";
    };
    readonly "gs.usageUnknown": {
        readonly zh: "占用：未知";
        readonly en: "Usage: unknown";
        readonly ja: "使用量：不明";
    };
    readonly "gs.usedSuffix": {
        readonly zh: " · 已用 {pct}%";
        readonly en: " · {pct}% used";
        readonly ja: " · {pct}% 使用";
    };
    readonly "gv.badge.cloudOnly": {
        readonly zh: "纯云端（未拉到本地）";
        readonly en: "Cloud only (not downloaded)";
        readonly ja: "クラウドのみ（未ダウンロード）";
    };
    readonly "gv.badge.conflictBoth": {
        readonly zh: "云端与本机各有新改动 —— 打开或推送时会请你裁决";
        readonly en: "New changes both in the cloud and on this device — you'll be asked to resolve on open or push";
        readonly ja: "クラウドとこの端末の両方に新しい変更があります——開くかプッシュ時に選択を求められます";
    };
    readonly "gv.badge.dirtyBoth": {
        readonly zh: "本地+云端 · 本地有未推改动";
        readonly en: "Local+cloud · unpushed local edits";
        readonly ja: "ローカル+クラウド · 未プッシュの変更あり";
    };
    readonly "gv.badge.float": {
        readonly zh: "仅本地 · 有未上传的改动（从未同步）";
        readonly en: "Local only · unsynced edits (never uploaded)";
    };
    readonly "gv.badge.ghost": {
        readonly zh: "云端副本已被移动或删除，本地有未推送的修改 —— 可「重命名留存」或「丢弃」";
        readonly en: "Cloud copy was moved or deleted while local has unpushed edits — “rename & keep” or “discard”";
        readonly ja: "クラウド側が移動/削除され、ローカルに未プッシュの変更があります——「改名して保持」か「破棄」を";
    };
    readonly "gv.badge.localOnly": {
        readonly zh: "仅本地（未上传云端）";
        readonly en: "Local only (not uploaded)";
        readonly ja: "ローカルのみ（未アップロード）";
    };
    readonly "gv.badge.localPlain": {
        readonly zh: "本地";
        readonly en: "Local";
        readonly ja: "ローカル";
    };
    readonly "gv.badge.newerOnCloud": {
        readonly zh: "云端有新版本 —— 打开会自动更新到云端版";
        readonly en: "A newer version exists in the cloud — opening will update to it";
        readonly ja: "クラウドに新しいバージョンがあります——開くと自動的に更新されます";
    };
    readonly "gv.badge.pendingGone": {
        readonly zh: "云端副本已消失，本地干净副本待处理 —— 可「重新上传」推回云端，或「删除」；宽限期后自动移入回收站";
        readonly en: "Cloud copy is gone; clean local copy pending — “re-upload” to push it back, or “delete”; auto-trashed after the grace period";
        readonly ja: "クラウド側が消失、ローカルのクリーンな複製が保留中——「再アップロード」か「削除」を。猶予期間後は自動でゴミ箱へ";
    };
    readonly "gv.badge.syncedBoth": {
        readonly zh: "本地+云端（已同步）";
        readonly en: "Local+cloud (synced)";
        readonly ja: "ローカル+クラウド（同期済み）";
    };
    readonly "gv.rootDir": {
        readonly zh: "/ 根目录";
        readonly en: "/ Root";
        readonly ja: "/ ルート";
    };
    readonly "gv.src.both": {
        readonly zh: "本地+云端";
        readonly en: "Local+cloud";
        readonly ja: "ローカル+クラウド";
    };
    readonly "gv.src.cloud": {
        readonly zh: "云端";
        readonly en: "Cloud";
        readonly ja: "クラウド";
    };
    readonly "gv.src.cloudStillAlive": {
        readonly zh: "{base}（云端仍在）";
        readonly en: "{base} (still in cloud)";
        readonly ja: "{base}（クラウドに残存）";
    };
    readonly "gv.src.local": {
        readonly zh: "本地";
        readonly en: "Local";
        readonly ja: "ローカル";
    };
    readonly "gv.time.dayAgo": {
        readonly zh: "{n} 天前";
        readonly en: "{n} d ago";
        readonly ja: "{n} 日前";
    };
    readonly "gv.time.hourAgo": {
        readonly zh: "{n} 小时前";
        readonly en: "{n} h ago";
        readonly ja: "{n} 時間前";
    };
    readonly "gv.time.justNow": {
        readonly zh: "刚刚";
        readonly en: "Just now";
        readonly ja: "たった今";
    };
    readonly "gv.time.minAgo": {
        readonly zh: "{n} 分钟前";
        readonly en: "{n} min ago";
        readonly ja: "{n} 分前";
    };
    readonly "gv.time.unknown": {
        readonly zh: "未知";
        readonly en: "Unknown";
        readonly ja: "不明";
    };
    readonly "menu.decrypt": {
        readonly zh: "解除加密…";
        readonly en: "Decrypt…";
        readonly ja: "暗号化を解除…";
    };
    readonly "menu.encrypt": {
        readonly zh: "加密保护…";
        readonly en: "Encrypt…";
        readonly ja: "暗号化…";
    };
    readonly "name.copySuffix": {
        readonly zh: "副本";
        readonly en: "copy";
        readonly ja: "コピー";
    };
    readonly "nd.custom": {
        readonly zh: "自定义…";
        readonly en: "Custom…";
        readonly ja: "カスタム…";
    };
    readonly "save.signInLater": {
        readonly zh: "暂不";
        readonly en: "Not now";
        readonly ja: "今はしない";
    };
    readonly "save.signInNow": {
        readonly zh: "登录";
        readonly en: "Sign in";
        readonly ja: "ログイン";
    };
    readonly "save.signInPromptTitle": {
        readonly zh: "已保存到本机";
        readonly en: "Saved on this device";
        readonly ja: "この端末に保存しました";
    };
    readonly "st.syncPushing": {
        readonly zh: "正在同步…";
        readonly en: "Syncing…";
        readonly ja: "同期中…";
    };
    readonly "st.fileRenaming": {
        readonly zh: "重命名…";
        readonly en: "Renaming…";
        readonly ja: "名前変更中…";
    };
    readonly "st.filePulling": {
        readonly zh: "拉取中…";
        readonly en: "Pulling…";
        readonly ja: "取得中…";
    };
    readonly "st.cloudChecking": {
        readonly zh: "检查云端…";
        readonly en: "Checking cloud…";
        readonly ja: "クラウドを確認中…";
    };
    readonly "st.fileDeleting": {
        readonly zh: "删除中…";
        readonly en: "Deleting…";
        readonly ja: "削除中…";
    };
    readonly "st.trashRestoring": {
        readonly zh: "恢复中…";
        readonly en: "Restoring…";
        readonly ja: "復元中…";
    };
    readonly "st.trashPurging": {
        readonly zh: "彻底删除…";
        readonly en: "Deleting permanently…";
        readonly ja: "完全に削除中…";
    };
    readonly "st.trashEmptyTrash": {
        readonly zh: "清空回收站…";
        readonly en: "Emptying trash…";
        readonly ja: "ゴミ箱を空にしています…";
    };
    readonly "st.trashEmptyBackups": {
        readonly zh: "清空备份箱…";
        readonly en: "Emptying backup box…";
        readonly ja: "バックアップボックスを空にしています…";
    };
    readonly "st.fileEncrypting": {
        readonly zh: "正在加密 {name}…";
        readonly en: "Encrypting {name}…";
        readonly ja: "暗号化中 {name}…";
    };
    readonly "st.fileDecrypting": {
        readonly zh: "正在解除加密 {name}…";
        readonly en: "Decrypting {name}…";
        readonly ja: "暗号化解除中 {name}…";
    };
    readonly "st.fileRekeying": {
        readonly zh: "正在换密码重封 {name}…";
        readonly en: "Re-keying {name}…";
        readonly ja: "パスワード変更中 {name}…";
    };
    readonly "st.fileReuploading": {
        readonly zh: "重新上传…";
        readonly en: "Re-uploading…";
        readonly ja: "再アップロード中…";
    };
    readonly "st.folderCreating": {
        readonly zh: "新建文件夹…";
        readonly en: "Creating folder…";
        readonly ja: "フォルダ作成中…";
    };
    readonly "st.folderDeleting": {
        readonly zh: "删除文件夹…";
        readonly en: "Deleting folder…";
        readonly ja: "フォルダ削除中…";
    };
    readonly "cf.cloudOfflineTitle": {
        readonly zh: "云端：离线（无法登录 / 同步；本地图库正常）";
        readonly en: "Cloud: offline (cannot sign in / sync; local gallery works normally)";
        readonly ja: "クラウド：オフライン（ログイン / 同期不可；ローカルギャラリーは正常）";
    };
};

export declare interface GalleryAttachment {
    state(): AttachmentState;
    /** 挂库（必须 detached）。五步逆序：建实例→换入→锁域→touch/relabel。
     *  opts.online：folder=权限已 granted / onedrive=isSignedIn（调用方查好传入；缺省 true）。
     *  opts.gesture=false：boot 静默重挂——跳过 requestPersist（persist 只在用户手势申请，P3 verdicts）。
     *  （bootAdopt 已退役 2026-08-27：店懒出生后 boot 领养 = 普通 attach，无预建实例可领。） */
    attach(entry: GalleryEntry, opts?: {
        online?: boolean;
        gesture?: boolean;
    }): Promise<void>;
    /** 卸库（绿灯门）。拒卸返账（doc-open / dirty），不销毁任何东西。detached 时幂等 ok。 */
    detach(): Promise<DetachResult>;
    /** 显式逃生（用户过了警告 sheet 才走到这）：不 drain、dirty 留缓存。 */
    forceDetach(): Promise<void>;
    onChange(cb: (s: AttachmentState) => void): () => void;
    /** 离线态翻牌（Slice C：权限/token 恢复或掉线时由 host 调；attached 外 no-op）。 */
    setOnline(v: boolean): void;
}

export declare interface GalleryCapability {
    galleryOnline(): boolean;
    hasGallery(): boolean;
}

export declare type GalleryDataFace = ReturnType<typeof createGalleryDataFace>;

/** 默认新建名 = yyyymmdd-hex4（家族惯例；两家 policy.defaultNewName 的默认实现）。禁「未命名」。 */
export declare function galleryDefaultName(now?: Date): string;

/** 图库对编辑器的全部要求（提案 §2 DocHost；WeebPaint session-state 的十处直调收成这一个端口）。 */
export declare interface GalleryDocHost extends VerbDoc {
    open(item: GItem): Promise<void>;
    /** 图片 tile 孪生语义（WeebPaint）：把图片字节转生成新文档；不实现 = 图片 tile 只显示不可开。 */
    importImageAsDoc?(file: File, opts: {
        nameOverride: string;
    }): Promise<void>;
}

export declare interface GalleryEncryption extends VerbEncryption {
    isUnlocked(): boolean;
    onLockChange(cb: (unlocked: boolean) => void): void;
    isEncryptedPeekBlob(b: Blob): boolean;
    localPeekThumb(name: string): Promise<Blob | null>;
    decryptCloudPeekThumb(name: string, enc: Blob): Promise<Blob | null>;
    /** 本地字节是不是加密容器（纯本地读文件头，无网络）。 */
    isEncrypted(name: string): Promise<boolean>;
}

export declare interface GalleryEntry {
    id: string;
    kind: GalleryKind;
    label: string;
    dbId: string;
    homeAccountId?: string;
    handle?: DirHandleLike;
    lastActive: number | null;
    createdAt: number;
}

export declare interface GalleryHandle {
    refresh(): void;
    setView(v: "files" | "trash"): void;
    getView(): "files" | "trash";
    setFolder(path: string): void;
    hydrateFolder(path: string): void;
    getFolder(): string;
    emptyTrash(scope?: "local" | "cloud" | "both"): void;
    requestUnlock(): Promise<boolean>;
    invalidateEncrypted(name: string): void;
    unmount(): void;
}

export declare interface GalleryItem {
    name: string;
    local: LocalSession | null;
    cloud: CloudFile | null;
    deletedAt?: number;
}

/** store.Item{path,syncState} → GItem（gallery-view-model 的输入；全部派生自 syncState，不重推导）。 */
export declare function galleryItemFromStoreItem(it: Item, naming?: NameBoundary): GItem;

export declare type GalleryKind = "onedrive" | "folder";

export declare type GalleryLang = "zh" | "en" | "ja";

export declare interface GalleryOpenPorts {
    hasGallery(): boolean;
    applyPendingTransient?(): void;
    isDirty(): boolean;
    saveImplicit(): Promise<void>;
    awaitCloudPushIdle(): Promise<void>;
    setMode(open: boolean): void;
    onClosed?(): void;
    status(msg: string, isError?: boolean): void;
}

export declare interface GalleryRegistry {
    list(): Promise<GalleryEntry[]>;
    /** isSameEntry 查重：同夹二挂复用旧条目（顺手刷新 label）；查不到才铸新 id。 */
    mintFolder(handle: DirHandleLike): Promise<GalleryEntry>;
    /** 同账号查重复用；首个 OneDrive 条目认领 legacy 命名空间 "defaultStore"（既有数据零迁移）。 */
    mintOneDrive(homeAccountId: string, username: string): Promise<GalleryEntry>;
    touch(id: string): Promise<void>;
    clearLastActive(): Promise<void>;
    relabel(id: string, label: string): Promise<void>;
    forget(id: string): Promise<void>;
    lastActive(): Promise<GalleryEntry | null>;
    /** 播种（幂等，靠 dedup 不靠标记；每次 auth 变化调都安全）：既有登录态 → legacy OneDrive 条目即激活。 */
    seedLegacyOneDrive(p: {
        homeAccountId: string;
        username: string;
    }): Promise<void>;
}

/** 浏览器单例（懒开库：import 本身零 IDB 访问，node 测试 import 安全）。 */
export declare const galleryRegistry: GalleryRegistry;

export declare interface GalleryScreenDeps {
    vue: VueRuntime;
    store: () => VerbStore | null;
    data: GalleryDataFace;
    doc: GalleryDocHost;
    host: VerbHost;
    ui: {
        iconHtml: (name: string, opts?: {
            size?: number;
            cls?: string;
        }) => string;
        /** 0.1.2：无缩略图时卡片占位内容（HTML，通常是一枚图标）。不给 → 退回名字首字（WeebPaint 默认；WXHW 2026-09-10 user「所有的预览图都是 2……不要从名字生成」→ 宿主给 book/file 图标）。 */
        tilePlaceholderHtml?: (name: string) => string | undefined;
    };
    /** 0.2.0：卡片比例。"1/1" 方图（WeebPaint 默认）；"2/3" 竖版书封（WXHW 书库；窄屏一排三本）。 */
    tile?: {
        aspect?: "1/1" | "2/3";
    };
    /** 0.2.1：这份文档有没有缩略图可取（WXHW：txt 稿没有 → 不去尾读、加密 txt 不显锁图标）。不给 = 全部都有（WeebPaint）。 */
    hasThumb?: (fullName: string) => boolean;
    naming?: NameBoundary;
    isZipDoc?: (fullName: string) => boolean;
    thumbs?: ThumbCache;
    imageThumbs?: {
        getOrFetch(path: string, token: string): Promise<Blob>;
    };
    encryption?: GalleryEncryption;
    /** 「上次在哪个夹」的记忆（WeebPaint = synced collection appState.currentDirectory）；不给 = 只记内存。 */
    folderMemory?: {
        get(): string;
        set(p: string): void;
    };
    /** 手指按住不重绘的门只在图库可见时持（WeebPaint: body[data-mode=gallery]）；不给 = 恒真。 */
    isGalleryVisible?: () => boolean;
    reportError: (err: unknown, level?: "error" | "warning" | "info" | "log") => void;
    openDiag?: () => void;
    reloadApp?: () => void;
}

export declare interface GallerySnapshot {
    path: string;
    items: GItem[];
    images: CloudImageItem[];
    others: CloudOtherItem[];
    folderNames: string[];
}

export declare type GalleryT = (key: GalleryTextKey, params?: Record<string, string | number>) => string;

export declare type GalleryTextKey = keyof typeof GALLERY_TEXT;

export declare const galleryTextKeys: () => GalleryTextKey[];

export declare interface GalleryTile {
    name: string;
    displayName: string;
    fullPath: string;
    time: number;
    size: number;
    badge: BadgeKind;
    badgeTitle: string;
    ghost: boolean;
    pendingGone: boolean;
    hasLocalThumb: boolean;
    cloud: CloudFileMeta | null;
    isActive: boolean;
    encrypted: boolean;
}

export declare type GalleryVerbs = ReturnType<typeof createGalleryVerbs>;

export declare interface GItem extends Omit<GalleryItem, "local" | "cloud"> {
    local: LocalSessionMeta | null;
    cloud: CloudFileMeta | null;
    dirty?: boolean;
    ghost?: boolean;
    pendingGone?: boolean;
    cloudNewer?: boolean;
    newerOnCloud?: boolean;
    conflict?: boolean;
}

export declare function humanSize(b: number | null | undefined): string;

export declare function humanTime(ts: number): string;

export declare function idbRegistryKV(): RegistryKV;

/** IndexedDB 实现：一个 DB 一个 object store（keyPath 无，out-of-line key）。打开失败自动重试一次（WeebPaint openDB 的自愈）。 */
export declare function idbThumbStore(opts: {
    dbName: string;
    storeName?: string;
    version?: number;
}): ThumbStore;

export declare interface IdbUsageReport {
    label: string;
    level: "ok" | "warn" | "critical";
    title?: string;
}

export declare function idbUsageReport(files: {
    usage(): Promise<{
        bytes: number;
        count: number;
    }>;
}, reportError?: (e: unknown, level: "warning") => void): Promise<IdbUsageReport | null>;

/** path → basename（picker 显示名；File 包装名 =「有名保名」命名规范的上游）。 */
export declare const imageBasename: (p: string) => string;

/** 缩略图新鲜度 token（cloud-thumb-cache 同款语义：lastModified 优先，退 size）。变 = 重拉覆盖同 key。 */
export declare function imageThumbToken(it: {
    lastModified?: number;
    size?: number;
}): string;

/** 孪生裸名（v0.9.34 拍板：图库点图片 = 开同夹同名 ora，没有才新建）：foo.png @ 夹A → "夹A/foo"。 */
export declare const imageTwinBareName: (folder: string, basename: string) => string;

/** boot 期调一次：页面生命周期 / 在线态面包屑 + pagehide flush。record() 不依赖它（懒加载）。 */
declare function initDiagLog(opts?: {
    app?: string;
    version?: string;
}): void;

export declare const isDocPath: (p: string) => boolean;

export declare const isImagePath: (p: string) => boolean;

export declare function isPng(bytes: Uint8Array): boolean;

export declare function itemTime(it: GalleryItem): number;

/** 全库清单。partialFolders = 没拿到权威帧的夹（诚实性：清单可能缺项，UI 要说出来）。 */
export declare interface LibraryManifest {
    files: BackupFileRef[];
    partialFolders: string[];
    foldersVisited: number;
    truncated: boolean;
}

export declare interface LocalSession {
    name: string;
    updatedAt?: number;
}

export declare interface LocalSessionMeta extends LocalSession {
    size?: number;
    thumb?: Blob | null;
    encrypted?: boolean;
    trashKey?: string;
}

/** 自适应缩略图：阶梯逐档、每档先无损后调色板，第一个 ≤ maxBytes 的胜出；都超 → 最小档调色板。 */
export declare function makeThumbAdaptive(src: RgbaImage, opts: MakeThumbOpts): ThumbResult;

export declare interface MakeThumbOpts {
    encodePng: PngEncoder;
    maxBytes?: number;
    ladder?: readonly number[];
    paletteColors?: number;
    /** 保 alpha（WeebPaint ora 约定「保 alpha 不涂底」）；false = 拍平白底（书封面）。默认 true。 */
    keepAlpha?: boolean;
}

export declare function memoryThumbStore(): ThumbStore;

/** File 包装的 MIME（decodeImageFile 实际按字节嗅探，给对只是礼貌）。 */
export declare function mimeForImageName(name: string): string;

export declare function mountGalleryScreen(el: HTMLElement, d: GalleryScreenDeps): GalleryHandle;

/** 裸名 ↔ 库全名的边界（WeebPaint：`X` ↔ `X.ora`；身份=全名的 app 传恒等/不传）。 */
export declare interface NameBoundary {
    bare: (s: string) => string;
    full: (bare: string) => string; /** 只管显示（tile 标题）：身份=全名的 app 用它去扩展名；不给 = 显示 basename。 */
    display?: (bare: string) => string;
}

export declare function naturalCompare(a: string, b: string): number;

/** 拿一个不占用的 `${base}.${ext}` / `${base} N.${ext}`（导出到云盘用；兜底加时间戳保证必返回）。
 *  isOccupied = store.files.nameOccupied 注入（本模块保持零 store 依赖可测）。 */
export declare function nextFreeExportName(base: string, ext: string, isOccupied: (name: string) => Promise<boolean>, fallbackStamp?: () => number): Promise<string>;

/** 面包屑（非错误的时间线事件）。tag 短词：boot / auth / gallery / page / net。 */
declare function note(tag: string, msg: string): void;

export declare function openGalleryFlow(p: GalleryOpenPorts, screen: {
    setView(v: "files" | "trash"): void;
}, after?: () => void): Promise<void>;

export declare const ORA_THUMB_PATH = "Thumbnails/thumbnail.png";

export declare function pathBasename(name: string): string;

export declare function pathFolder(name: string): string;

export declare function pathJoin(folder: string, name: string): string;

export declare interface PeekableFile {
    getPeek(o: {
        bytesLength: number;
        zipEntry: string;
        source: "local" | "cloud";
    }): Promise<Blob | null>;
}

export declare const PNG_BLURB_KEYWORD = "Description";

export declare type PngEncoder = (rgba: Uint8ClampedArray, w: number, h: number, colors: number) => Uint8Array;

/** 读全部文本块 → 关键字到文本的映射。同关键字多块取最后一个。 */
export declare function readPngText(png: Uint8Array): Record<string, string>;

export declare function readSlate(galleryId?: string): ResumeSlate;

/** 记一条。msg 截到 600 字符；环满丢最旧。 */
declare function record(level: DiagLevel, msg: string): void;

/** 存储 port（结构 clone 语义；IDB 适配器/Map 假件同形）。 */
export declare interface RegistryKV {
    put(e: GalleryEntry): Promise<void>;
    delete(id: string): Promise<void>;
    list(): Promise<GalleryEntry[]>;
}

export declare const REKEY_OK: ReadonlySet<string>;

export declare function renderCloudAuthChip(els: CloudAuthChipEls, auth: CloudAuthPort, icons: {
    out: string;
    in: string;
}, opts?: {
    latin?: (key: "cf.cloudOfflineTitle") => string;
}): void;

export declare function restoreLastSession(p: RestorePorts): Promise<RestoreOutcome>;

export declare type RestoreOutcome = "restored" | "fresh-first-boot" | "gallery-deliberate" | "blank-failed" | "blank-crash-loop" | "blank-locked-elsewhere" | "blank-no-gallery";

export declare interface RestorePorts {
    /** 回执条的 opened（P5 2026-08-27：typed union 取代 null/""/名 三态哨兵——resume-slate 器官）。
     *  null=从未绑定（首次）→ 新画布；{kind:"gallery"}=上次停在图库（有意）→ 图库；
     *  {kind:"doc",path} → 自动恢复它（P1.5 拍板语义原样）。 */
    getResume(): ResumeOpened;
    /** 真正去开（store.file.open + adopt）。返回是否装入了字节。 */
    restore(name: string): Promise<boolean>;
    /** 只改内存里的活动名，**不动持久的 currentFile**（= session.setName(x, {persist:false})）。 */
    setNameMemoryOnly(name: string | null): void;
    /** 「上次就停在图库」（wanted 为空 = 用户离开时的**有意**状态）的落点。
     *  ⚠ canvas-first（P1 2026-08-26，verdicts §2.4「boot 永不 404 跳 gallery」）：只有这条有意路
     *  还落图库；失败/断路/锁 三条路一律落画布——图库不是失败的垃圾桶。 */
    openGallery(): Promise<void>;
    updateSaveStatus(): void;
    onOpened(name: string): void;
    onNotFound(name: string): void;
    /** 上次 boot 留下的 attempt 标记（优雅收场会清 null；非 null = 上次死在开它的半路）。 */
    getRestoreAttempt(): string | null;
    /** ⚠ 契约：本写入必须**同步落盘**（slate 器官 = localStorage 单键写天然满足）——OOM 崩溃可比任何
     *  防抖快。v0.10.9 的 flushMarker 端口因此退役（P5 2026-08-27）。 */
    setRestoreAttempt(name: string | null): void;
    onCrashLoopSkipped(name: string): void;
    /** 无 Web Locks 支持时恒 false（整套降级为现状，行为不变）。 */
    isDocLockedElsewhere(name: string): Promise<boolean>;
    onLockedElsewhere(name: string): void;
    /** 关闭态恒 false（含容器未配置 auth）。 */
    hasGallery(): boolean;
    /** 云关落点（P1.5 起**只剩云关这一条路**用它）：plain 空白画布（无 store 家可安，无 session 绑定；
     *  P2 transient 接手后升级）。⚠ 纯 UI 落点，零数据变更：currentFile/标记一个都不碰。 */
    openBlankCanvas(): Promise<void>;
    /** 云关落点的提示文案（为什么没自动开上次的画）——与 openBlankCanvas 分离：落点共用、文案各表。 */
    onNoGallery(): void;
    /** 云开态的画布落点（P1.5）= **可画的新画布**（lazyblank：日期默认名、首笔自动安家进图库——
     *  瑞士奶酪：云开态不许存在「能画但存不了」的画布）。首次 + 失败/断路/锁 四条路共用；
     *  与 openBlankCanvas（云关 plain blank，无 store 家可安，P2 transient 接手）分开。
     *  内部自管身份（memory-only 日期名），故这些路径先 setNameMemoryOnly(null) 再调它不冲突。 */
    openFreshCanvas(): Promise<void>;
}

/** 上次离开时开着什么（boot 三态的 typed 形；P1.5 user 拍板「首次新画布，上次图库则图库」）。 */
export declare type ResumeOpened = {
    kind: "doc";
    path: string;
} | {
    kind: "gallery";
} | null;

export declare interface ResumeSlate {
    opened: ResumeOpened;
    /** 崩溃环断路标记（boot-restore 纪律③）：boot 自动开画前写目标名，优雅收场清 null。
     *  与 opened 同记录同原子写——「写标记必须先于 restore 落盘」由同步写直接保证。 */
    restoreAttempt: string | null;
}

export declare interface RgbaImage {
    data: Uint8ClampedArray;
    w: number;
    h: number;
}

export declare function runChangePassword(d: ChangePasswordDeps): Promise<ChangePasswordReport>;

export declare function runFullLibraryBackupFlow(p: BackupFlowPorts): Promise<void>;

/** 逐件取字节 → 进包或溢出下载 → 最后封包交付。整个过程只读。 */
export declare function runLibraryBackup(files: BackupFileRef[], ports: BackupPorts, opts?: {
    budget?: number;
    now?: Date;
    renderManifest?: (r: {
        zipped: string[];
        spilled: string[];
        failed: string[];
    }) => string;
}): Promise<BackupReport>;

export declare function setActiveGalleryId(id: string | null): void;

/** 唯一写点①：活动身份持久化（原 setCurrentSessionName 的持久层）。
 *  开画成功 = app 活着且真拿住画 → 崩溃环标记一并解除（原 appState.restoreAttempt=null 语义）。 */
export declare function setOpened(opened: ResumeOpened, galleryId?: string): void;

/** 唯一写点②：崩溃环标记（boot-restore 纪律③）。同步落盘——无需 flush。 */
export declare function setRestoreAttempt(name: string | null, galleryId?: string): void;

/** 订阅 → 一次性快照。退出条件（先到先算）：
 *  · 收到权威帧（complete && !stale）——正常在线路径，一次云列举就返回；
 *  · 收到 ≥2 帧（库的两帧节律：本地帧 + 云端帧都到齐了）——离线/未登录时云端帧 complete:false，就是终局；
 *  · settleMs 内没有新帧 / 超过 timeoutMs —— 兜底，拿手上最后一帧诚实返回（authoritative:false）。
 *  无论走哪条都**必定退订**（备份绝不留下常驻订阅）。 */
export declare function snapshotFolderOnce(watch: WatchFolderFn, folder: string, opts?: {
    settleMs?: number;
    timeoutMs?: number;
}): Promise<FolderProbe>;

/** legacy / 唯一库的 id（原 WeebPaint doc-home.ts；宿主 doc-home 改从本包 import）。 */
export declare const SOLE_GALLERY_ID = "default";

/** 溢出逐件下载时的落地名：路径分隔符压成 `_`，保住来源夹（不同夹同名不会互相盖）。 */
export declare const spillName: (path: string) => string;

export declare interface StoreUIDeps {
    busy: <T>(label: string, fn: () => Promise<T>) => Promise<T>;
    showNotice: (opts: NoticeOpts) => NoticeHandle;
    sheets: SyncGateSheets;
    reportError: (err: unknown, level?: "error" | "warning" | "info" | "log") => void;
    naming?: NameBoundary;
    /** 宿主 i18n 接管 store 的 busy 文案（不给 = 包内默认 st.*）。 */
    text?: (key: StoreTextKey, params?: StoreTextParams) => string | undefined;
}

export declare function storeUIFor(d: StoreUIDeps): StoreUI;

export declare const SUFFIX_BYTES = 81920;

/** attach/detach 需要的全 Store 最小面（app-store seam 供真件；测试供假件）。 */
export declare interface SwappableStore {
    dispose(opts?: {
        drain?: boolean;
    }): Promise<void>;
    files: {
        dirty: {
            count(): Promise<number>;
        };
    };
}

/** 宿主提供的 sheet 面（WeebPaint sheets.ts / WXHW sheets.ts 同形；本包不出 sheet UI）。 */
export declare interface SyncGateSheets {
    lockSyncGate<T = string>(o: {
        title: string;
        message: string;
        showSpinner?: boolean;
        note?: string;
        actions: {
            label: string;
            value: T;
            primary?: boolean;
        }[];
    }): Promise<T>;
    settleSyncGate(value: unknown): void;
}

export declare const t: GalleryT;

export declare const THUMB_LADDER: readonly number[];

export declare const THUMB_MAX_BYTES: number;

export declare const THUMB_PALETTE_COLORS = 256;

export declare interface ThumbCache {
    read(name: string): Promise<CachedThumb | null>;
    write(name: string, token: string, blob: Blob): Promise<void>;
    invalidate(name: string): Promise<void>;
    onInvalidated(fn: (key: string) => void): () => void;
    getOrFetch(name: string, token: string, source: ThumbSource): Promise<{
        blob: Blob;
        fromCache: boolean;
    }>;
    clear(): Promise<number>;
    readonly stats: {
        hits: number;
        misses: number;
        errors: number;
    };
    readonly config: {
        skipCache: boolean;
    };
}

export declare interface ThumbCacheDeps {
    store: ThumbStore;
    /** 真取图（app 域：ora 的 Thumbnails/thumbnail.png 经 store getPeek；WXHW 以后自定）。取不到 → 抛。 */
    fetch: (name: string, source: ThumbSource) => Promise<Blob>;
    /** 裸名 → 缓存 key（store 身份 + 多库前缀）。 */
    keyOf: (name: string) => string;
    report?: (err: unknown) => void;
    now?: () => number;
}

/** 多库 key：legacy 库 id "default" 不加前缀（WeebPaint 存量缓存零迁移）。 */
export declare const thumbKeyFor: (galleryId: string, fullName: string) => string;

export declare interface ThumbResult {
    png: Uint8Array;
    w: number;
    h: number;
    colors: number;
    edge: number;
}

export declare type ThumbSource = "local" | "cloud";

export declare interface ThumbStore {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<number>;
}

/** 缩到长边 ≤ max 的目标尺寸（不放大）。 */
export declare function thumbTargetSize(w: number, h: number, max: number): {
    w: number;
    h: number;
};

export declare function tileFor(item: GItem, opts: {
    signedIn: boolean;
    activeName: string | null;
    encrypted?: boolean;
}): GalleryTile;

/** 复制/展示用的整段文本：环境头 + 每条一行「MM-DD HH:MM:SS.mmm L msg」（旧在上、新在下）。 */
declare function toText(): string;

export declare interface TrashGItem {
    name: string;
    deletedAt?: number;
    local: LocalSessionMeta | null;
    cloud: CloudFileMeta | null;
    encrypted?: boolean;
    conflictLive?: boolean;
}

export declare interface TrashTile {
    name: string;
    deletedAt: number;
    source: string;
    hasLocalThumb: boolean;
    cloud: CloudFileMeta | null;
    local: LocalSessionMeta | null;
}

export declare function trashTileFor(item: TrashGItem): TrashTile;

export declare function uniqueBareName(stem: string, occupied: (fullName: string) => Promise<unknown>, naming?: NameBoundary): Promise<string>;

export declare interface VerbDeps {
    store: () => VerbStore;
    host: VerbHost;
    doc: VerbDoc;
    naming?: NameBoundary;
    /** 这份文档在 store 里是不是 zip 容器（WeebPaint .ora 恒 true；WXHW .txt false / .webxiaoheiwu.zip true）。 */
    isZipDoc?: (fullName: string) => boolean;
    thumbs?: {
        invalidate(name: string): Promise<void> | void;
    };
    onEncryptionChanged?: (name: string) => void;
    encryption?: VerbEncryption;
}

/** 编辑器侧（DocHost 的动词子集）：只管**当前打开**的那份。 */
export declare interface VerbDoc {
    renameActive(): Promise<string | null>;
    setName(name: string): void;
    push(item: GItem): Promise<void>;
    unload(item: GItem): Promise<void>;
    exit(): Promise<void>;
    dropCheckpoint(name: string): Promise<void> | void;
}

export declare interface VerbEncryption {
    ensureUnlocked(name: string): Promise<boolean>;
    ensureNewPassword(): Promise<string | null>;
    isFreshPasswordSetup(): boolean;
    rollbackFreshPassword(): void;
    setPassword(pw: string): void;
}

export declare interface VerbFile {
    tryMove(to: string): Promise<{
        ok: true;
    } | {
        ok: false;
        where: "local" | "cloud";
    }>;
    delete(): Promise<{
        status: string;
        queuedCloudDelete?: boolean;
    }>;
    reupload(): Promise<{
        status: string;
    }>;
    getEncryptedBlob(): Promise<Blob | null>;
    open(): Promise<Blob | null>;
    save(bytes: Blob, opts: {
        tryPush: boolean;
    }): Promise<unknown>;
    encrypt(o: {
        isOnline: () => boolean;
    }): Promise<{
        status: string;
    }>;
    decrypt(o: {
        isOnline: () => boolean;
    }): Promise<{
        status: string;
    }>;
}

export declare interface VerbHost {
    signedIn(): boolean;
    online(): boolean;
    activeName(): string | null;
    confirm(title: string, msg: string): Promise<boolean>;
    input(title: string, def: string, opts?: {
        placeholder?: string;
    }): Promise<string | null>;
    chooseFolder(title: string, msg: string, options: {
        label: string;
        value: string;
    }[]): Promise<string | null>;
    status(msg: string, isError?: boolean): void;
    busy<T>(label: string, fn: () => Promise<T>): Promise<T>;
}

export declare interface VerbStore {
    file(name: string, opts: {
        isZip: boolean;
        mode: "new" | "existing";
    }): VerbFile;
    files: {
        nameOccupied(name: string): Promise<unknown>;
        deleteFolder(path: string): Promise<unknown>;
        restoreTrash(o: {
            trashKey: string | null;
            fromCloud: boolean;
            cloudRef: string | null;
            targetName: string;
            encrypted: boolean;
        }): Promise<{
            name?: string;
        }>;
        purgeTrash(o: {
            trashKey: string | null;
            cloudRef: string | null;
        }): Promise<unknown>;
        emptyTrash(o: {
            scope: "local" | "cloud" | "both";
        }): Promise<{
            failed?: {
                where?: string;
            }[];
        }>;
    };
}

/** 宿主 vendored 的 Vue prod ESM（提案 §7.1 决定 (a)）。 */
export declare interface VueRuntime {
    createApp: (root: unknown) => {
        mount(el: HTMLElement): unknown;
        unmount(): void;
    };
    defineComponent: (o: unknown) => unknown;
    reactive: <T extends object>(o: T) => T;
    ref: <T>(v: T) => {
        value: T;
    };
    computed: <T>(fn: () => T) => {
        value: T;
    };
    watch: (src: () => unknown, cb: () => void) => void;
    onMounted: (fn: () => void) => void;
    onUnmounted: (fn: () => void) => void;
    nextTick: (fn?: () => void) => Promise<void>;
}

/** 逐夹快照 → 全库扁平清单（BFS；同 path 去重、子夹去重防环、maxFolders 兜住病态深树）。 */
export declare function walkLibrary(probe: (folder: string) => Promise<FolderProbe>, opts?: {
    root?: string;
    maxFolders?: number;
    onFolder?: (folder: string, visited: number) => void;
}): Promise<LibraryManifest>;

export declare interface WatchdogTimers {
    set(fn: () => void, ms: number): unknown;
    clear(handle: unknown): void;
}

export declare type WatchFolderFn = (folder: string, cb: (s: WatchSnapshot) => void) => () => void;

/** watchFolder 快照的**结构型**端口（刻意不 import 库类型：本模块零 store 依赖）。 */
export declare interface WatchSnapshot {
    path: string;
    items: {
        path: string;
        size?: number;
        syncState?: string;
    }[];
    folders: string[];
    complete: boolean;
    stale?: true;
}

export declare function wireCapabilityBroadcast(win: {
    addEventListener: Window["addEventListener"];
    dispatchEvent: Window["dispatchEvent"];
}): void;

export declare function wireCloudAuthRefresh(els: Pick<CloudAuthChipEls, "refreshBtn">, auth: CloudAuthPort, after: () => void): void;

/** 写 / 删一个关键字的文本：先删同关键字的旧块（tEXt / zTXt / iTXt），text 非空则在 IEND 前插一块 iTXt（UTF-8）。
 *  非 PNG / 无 IEND → 原样返回（不假装成功）。关键字按 PNG 规范 1–79 字节 Latin-1。 */
export declare function withPngText(png: Uint8Array, keyword: string, text: string | null): Uint8Array;

export { }
