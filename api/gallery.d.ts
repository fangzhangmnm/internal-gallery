export declare function activeGalleryId(): string;

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

export declare type BadgeKind = "syncedBoth" | "dirtyBoth" | "cloudOnly" | "localOnly" | "ghost" | "pendingGone" | "newerOnCloud" | "conflictBoth";

export declare function breadcrumb(folder: string): Crumb[];

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

export declare interface ChangePasswordReport {
    moved: string[];
    kept: {
        name: string;
        status: string;
    }[];
}

declare function clear(): void;

export declare interface CloudFile {
    path: string;
    name?: string;
    lastModifiedDateTime?: string;
}

export declare interface CloudFileMeta extends CloudFile {
    id?: string;
    size?: number;
}

export declare function configureDeviceKv(kv: DeviceKv): void;

/** 宿主接管文案（缺 key 时宿主应返回 null/undefined 以落回默认；返回空串也当缺）。 */
export declare function configureText(opts: {
    t?: (key: GalleryTextKey, params?: Record<string, string | number>) => string | null | undefined;
    lang?: GalleryLang;
}): void;

export declare function copyTargetName(sourceName: string, taken: (name: string) => boolean): string;

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

export declare function createGalleryAttachment(deps: AttachmentDeps): GalleryAttachment;

/** 当前库「在线可推」谓词（0828 bug 修：folder 挂着仍显无云——isSignedIn 是 MSAL 词，folder 库别问它）。
 *  SSoT = attachment 器官的 online 旗（folder=权限已授，**本地即在线与网络无关**；onedrive=登录态）；
 *  onedrive 额外 && navigator.onLine（浏览器离线推不动）。全 app 问「云腿现在能不能推」只准问这里。 */
export declare function createGalleryCapability(deps: {
    attachment: Pick<GalleryAttachment, "state">;
    hasLiveStore: () => boolean;
    onLine?: () => boolean;
}): GalleryCapability;

export declare function createGalleryRegistry(kv: RegistryKV): GalleryRegistry;

export declare interface Crumb {
    label: string;
    path: string;
    current: boolean;
}

/** 包内默认 t：zh/en 默认串。 */
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

export declare interface FirstFrameWatchdog {
    arm(folder: string): void;
    frame(folder: string): void;
    cancel(): void;
    isArmed(): boolean;
}

/** RGBA 平铺到白底（就地写，返回同一 buffer）：jpeg 无 alpha，透明区不平铺会糊成黑。 */
export declare function flattenOntoWhite(data: Uint8ClampedArray): Uint8ClampedArray;

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

/** 能力变更广播（window 事件；消费方自己重读 hasGallery()）。P3 起由换库事件驱动。 */
export declare const GALLERY_CAPABILITY_EVENT = "wp:gallery-capability-changed";

export declare const GALLERY_PACKAGE_BIRTH: "2026-09-09";

export declare const GALLERY_TEXT: Record<GalleryTextKey, Record<GalleryLang, string>>;

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

/** 默认新建名 = yyyymmdd-hex4（家族惯例；两家 policy.defaultNewName 的默认实现）。禁「未命名」。 */
export declare function galleryDefaultName(now?: Date): string;

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

export declare interface GalleryItem {
    name: string;
    local: LocalSession | null;
    cloud: CloudFile | null;
    deletedAt?: number;
}

export declare type GalleryKind = "onedrive" | "folder";

export declare type GalleryLang = "zh" | "en";

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

export declare type GalleryT = (key: GalleryTextKey, params?: Record<string, string | number>) => string;

export declare type GalleryTextKey = "gv.badge.ghost" | "gv.badge.pendingGone" | "gv.badge.dirtyBoth" | "gv.badge.newerOnCloud" | "gv.badge.conflictBoth" | "gv.badge.syncedBoth" | "gv.badge.cloudOnly" | "gv.badge.localOnly" | "gv.badge.localPlain" | "gv.badge.float" | "gv.rootDir" | "gv.time.unknown" | "gv.time.justNow" | "gv.time.minAgo" | "gv.time.hourAgo" | "gv.time.dayAgo" | "gv.src.both" | "gv.src.local" | "gv.src.cloud" | "gv.src.cloudStillAlive" | "name.copySuffix";

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

/** File 包装的 MIME（decodeImageFile 实际按字节嗅探，给对只是礼貌）。 */
export declare function mimeForImageName(name: string): string;

/** 裸名 ↔ 库全名的边界（WeebPaint：`X` ↔ `X.ora`；身份=全名的 app 传恒等/不传）。 */
export declare interface NameBoundary {
    bare: (s: string) => string;
    full: (bare: string) => string;
}

export declare function naturalCompare(a: string, b: string): number;

/** 拿一个不占用的 `${base}.${ext}` / `${base} N.${ext}`（导出到云盘用；兜底加时间戳保证必返回）。
 *  isOccupied = store.files.nameOccupied 注入（本模块保持零 store 依赖可测）。 */
export declare function nextFreeExportName(base: string, ext: string, isOccupied: (name: string) => Promise<boolean>, fallbackStamp?: () => number): Promise<string>;

/** 面包屑（非错误的时间线事件）。tag 短词：boot / auth / gallery / page / net。 */
declare function note(tag: string, msg: string): void;

export declare function pathBasename(name: string): string;

export declare function pathFolder(name: string): string;

export declare function pathJoin(folder: string, name: string): string;

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

export declare function runChangePassword(d: ChangePasswordDeps): Promise<ChangePasswordReport>;

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

export declare const t: GalleryT;

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

export { }
