# 提案 .h：`@internal/gallery` 0.1 的接口契约（pin 住的目标；实现中形状变了要回写这里）
> 作者：Claude Fable 5.1（claude-fable-5-1）· created 20260909 · as-of 0.0.0（零模块）· 状态：**待 user 过目**，过目前不搬任何模块
> 现状 .h = WeebPaint `../20260524 WeebPaint/api/src/**`（v0.14.9），本文不复制签名，只写目标契约与每个模块的去向。spec = WeebPaint 行为（user 2026-09-09）。计划全貌 = 家族根 `ai-docs/20260909-wxhw-2.0-long-haul-plan.md`。

## 0. 一句话

图库 = **一个 `createGallery(deps)`**，吃四样注入（store、`DocHost`、UI 原子、`t`）加一份 app 政策，吐一个 `GalleryHandle`；编辑器只发事件不 import 图库。

## 1. 门牌（`exports`）

只有一个门牌 `.`：`createGallery`、全部 port 类型、纯函数（view-model / 命名代数 / 守卫），以及 `storeUIFor(deps)`（store 的 `ui` bundle 工厂）。**没有 `./ui` 子门牌**——UI 原子从 `@internal/workbench-elements` 来，本包不出 UI 原子。

## 2. 端口（`src/ports.ts`）

```ts
// ── 图库 → 编辑器（图库调，编辑器实现；WeebPaint 现有 GalleryHost 的接班人）──
export interface DocHost {
  currentName(): string | null;                       // 当前打开的文档身份（全名）；无 → null
  isDirty(): boolean;
  open(name: string): Promise<boolean>;               // 图库点开一份；true = 编辑器已切过去（含拉云/adopt/解锁）
  newDoc(spec: unknown): Promise<string | null>;      // spec 是 app 域（画布模板 / 空 txt / 工程 zip）；返新身份或 null（取消/失败）
  renameActive(to: string): Promise<RenameResult>;    // **只管当前打开的那份**（编辑器持有它的 home / 句柄）；非活动文档的改名由图库直接 tryMove
  push(): Promise<void>;                              // 手动推云当前文档
  unload(): Promise<void>;                            // 关掉当前文档（offload / detach 前）
  exit(): Promise<void>;                              // 退回图库（关文档，进 gallery 模式）
  encrypt?(name: string): Promise<EncStatus>;         // 可选：有加密的 app 才实现；活动文档要在内存换钥，所以走编辑器
  decrypt?(name: string): Promise<EncStatus>;
}
export type RenameResult = { ok: true; name: string } | { ok: false; where: "local" | "cloud" | "failed"; keptInput: string };
export type EncStatus = { status: string };

// ── 编辑器 → 图库：只发事件，永不调图库方法 ──
export interface GalleryEventSource {
  on(ev: "docOpened" | "docClosed" | "docSaved" | "docRenamed" | "encryptionChanged" | "folderChanged", cb: (e: GalleryEvent) => void): () => void;
}
export type GalleryEvent =
  | { type: "docOpened"; name: string } | { type: "docClosed" } | { type: "docSaved"; name: string }
  | { type: "docRenamed"; from: string; to: string } | { type: "encryptionChanged"; name: string }
  | { type: "folderChanged"; path: string };
// 替换掉 WeebPaint 里 session-state 反向直调的 gallery.refresh()×5 / invalidateEncrypted()×2 / setFolder()×1。

// ── 注入 ──
export interface GalleryDeps {
  store: () => StoreFace | null;        // 当前库；多库切换后返回值会变；null = 无库模式（真 null，无替身）
  host: DocHost;
  events: GalleryEventSource;
  ui: WorkbenchElements;                // @internal/workbench-elements：iconHtml / togglePopupMenu / showNotice / sheets{input,confirm,choice,lockSyncGate,unlockSyncGate,settleSyncGate} / busy{show,hide,with}
  t: (key: GalleryTextKey, params?: Record<string, string | number>) => string;   // 闭集 key 由本包定义（§6）
  vue: VueRuntime;                      // 宿主 vendored 的 Vue prod ESM 注入（§7 开放问题 1）
  policy: GalleryPolicy;
  diag?: (level: "error" | "warning" | "info" | "note", msg: string) => void;   // 黑匣子 sink；不给 = console
}
export type StoreFace = Pick<Store, "file" | "files" | "collection" | "dispose">;   // @internal/store 类型
export interface VueRuntime { createApp: ...; defineComponent: ...; reactive: ...; ref: ...; computed: ...; watch: ...; onMounted: ...; onUnmounted: ...; nextTick: ... }

// ── app 政策（图库对内容零知识，全靠这里）──
export interface GalleryPolicy {
  appId: string;
  docExtensions: readonly string[];                 // 哪些扩展名是「文档」（可打开）：WeebPaint [".ora"]，WXHW [".txt", ".webxiaoheiwu.zip"]
  imageExtensions?: readonly string[];              // 图库里当图片显示的（WeebPaint 用；WXHW 2.0 空）
  defaultNewName: () => string;                     // 新建默认名（两家都是 yyyymmdd-hex4；改名自由文本）
  thumb?: {                                          // 缩略图：不给 = 无缩略图（WXHW 2.0）
    peek: (name: string, source: "local" | "cloud") => Promise<Blob | null>;   // 从 store getPeek 取的 app 域读取器（ora: Thumbnails/thumbnail.png）
    decryptPeek?: (name: string, enc: Blob) => Promise<Blob | null>;
  };
  encryption?: {                                     // 不给 = 无加密 UI
    isEncrypted: (name: string) => Promise<boolean>;
    unlock: (name: string) => Promise<boolean>;
    changePassword?: (targets: string[], oldPw: string, newPw: string) => Promise<ChangePasswordReport>;
  };
  libraries: {                                       // 多库路由（无地骑士）
    buildStore: (entry: GalleryEntry) => StoreFace;  // app 造 store（OneDrive / folder provider 都是 app 的 createStore 声明）
    oneDrive?: { signIn(mode: "popup" | "redirect"): Promise<...>; activeAccount(): ...; };
    canPickFolder: () => boolean;                    // FSA 可用？
  };
}
```

## 3. 模块去向（现状 → 目标）

桶：**搬** = 逐字搬 + 测试同行；**塑** = 保留行为、切掉宿主耦合；**留** = 留在 app；**扔** = 不进包。

| 现状（WeebPaint） | 桶 | 目标路径 | 要切的东西 |
|---|---|---|---|
| gallery/gallery-model.ts, gallery-path.ts, natural-order.ts | 搬 | core/model/ | 无 |
| gallery/gallery-view-model.ts | 搬+补 | core/model/view-model.ts | `BadgeKind` 8 → **9**（加 `float`，对齐 store `SyncState`）；`GItem` 改吃 store `Item.syncState` 直接派生（`itemToG` 从 app-store 搬进来、命名导出为 `GalleryItemVM`） |
| gallery/cloud-image-model.ts | 搬 | core/model/image-model.ts | 图片扩展名从 `policy.imageExtensions` 来 |
| gallery/frame-gate.ts, first-frame-watchdog.ts | 搬 | core/guards/ | 无（已注入 timers） |
| diag-log.ts | 搬 | core/guards/diag-log.ts | device-kv 由 `deps` 注入（本包不碰 localStorage） |
| gallery-registry.ts, gallery-attachment.ts, gallery-capability.ts, active-gallery.ts | 搬 | core/library/ | registry 的 IDB KV 保留在包内（ADR-0024：device-local 永不同步，是包的合法私有 IDB） |
| gallery-connect.ts | 塑 | core/library/connect.ts | MSAL / FSA 具体调用改走 `policy.libraries`；`flow-lock` 一并搬 |
| resume-slate.ts, boot-restore.ts | 搬 | core/boot/ | slate 的 localStorage 写改走注入的 device-kv |
| gallery/cloud-thumb-cache.ts, image-thumbs.ts, cloud-thumbs.ts, enc-thumbs.ts | 塑 | core/thumbs/ | 读取器从 `policy.thumb` 来；`CachedThumb` 类型导出；IDB 名带 appId + galleryId（沿用） |
| gallery/library-backup.ts | 搬 | core/backup/ | 无（已是 ports 式） |
| gallery/change-password.ts | 搬 | core/change-password.ts | 无 |
| app-store.ts 的图库数据面（watchFolder 包装、itemToG、listGalleryTrash、`_swapStoreForGallery`、`_buildStoreForGalleryEntry`） | 塑 | core/data-face.ts | `_swapStoreForGallery` 变成 attachment 的 `swap` 注入；`_buildStoreForGalleryEntry` 变成 `policy.libraries.buildStore` |
| gallery/gallery.ts（Vue 深模块） | 塑 | ui/gallery-screen.ts | `GalleryHost` → `DocHost` + `policy`；`import session-state` 十处全部改走 `DocHost`；Vue 从 `deps.vue` 来 |
| gallery/gallery-shell.ts | 塑 | ui/gallery-shell.ts | 摸 `els.*` 改为 `mount(root: HTMLElement)`；`AppContext` 依赖归零；新建 sheet 的 spec 由 `host.newDoc(spec)` 承接 |
| gallery/gallery-manage-ui.ts | 塑 | ui/manage-ui.ts | 同上 |
| gallery/cloud-auth-ui.ts | 塑 | ui/cloud-auth-chip.ts | 摸 els 改为注入容器 |
| store-ui.ts（StoreUI bundle） | 塑 | ui/store-ui.ts（`storeUIFor(deps)`） | 建在 workbench-elements 的 sheets 上；QUIET_KEYS 政策进包 |
| sheets.ts, fullscreen-busy.ts | 留→A5 | `@internal/workbench-elements` | 这是 UI 原子，归 CatsUp 总账 A5；`SyncGateOpts` / `SyncGateAction` 必须导出 |
| doc-home.ts, save-status.ts, crash-banner.ts, store-absent.ts | 留 | 宿主 | 编辑器的事（文档住哪、保存状态条、崩溃横幅、平台无 store 门） |
| app-context.ts 的 `GalleryHandle` 反向 import | 扔 | — | 类型环随 `DocHost` 一起消失：宿主只拿 `createGallery` 返回的 `GalleryHandle` |
| `src/gallery/` 「检疫院不分层」 | 扔 | — | 包内 core/ 与 ui/ 分层，build lint：core 禁 import DOM、ui 禁 import 宿主 |
| WXHW `drawer.ts` / `docs.ts` / 一层夹 / `float`→local-only 映射 | 扔 | — | WXHW 2.0 消费本包（ADR-0011） |

## 4. 政策默认（进包当行为，来源 = WeebPaint 现状）

只订阅当前一层、永不 list 全库；移动只给「上级 + 可见子夹」，无树选择器；`sync.pushing` / `file.renaming` 走通知条不上全屏蒙版；不可打开的杂物文件照样显示；删除 / 改名失败文案落在重开的对话框；排序 natural 降序；文件夹永远嵌套；新建默认名由 `policy.defaultNewName`，改名自由文本；`ghost` 与 `pendingGone` 图标必须可区分；徽章 9 值。

## 5. 红线兜底九件（随模块搬，测试同行）

| 兜底 | 现状测试 |
|---|---|
| 删 = 回收站（读 `DelResult`，不报假成功） | gallery.ts 手工路径 → 本包补 verbs 测试 |
| 冲突必弹（open 2 钮 / push 3 钮，永不静默 cancel） | store-ui（无测试）→ 本包补 |
| 改名失败保输入 + 重试 | gallery.ts while 循环 → 本包 verbs 测试 |
| 失败不报成功（emptyTrash 部分失败、folderDelete 抛） | 同上 |
| dirty 不驱逐（detach 五步绿灯门） | `test/gallery-attachment.test.mjs` |
| pendingGone 有动作、与 ghost 区分 | `test/gallery-view-model.test.mjs` |
| 首帧看门狗 | `test/first-frame-watchdog.test.ts` |
| 黑匣子面包屑 | diag-log（无测试）→ 本包补 |
| restoreAttempt 断路器 | `test/boot-restore.test.ts`, `test/resume-slate.test.mjs` |

## 6. `t()` 的闭集问题

WeebPaint 的 `t(key)` 是 `keyof typeof S` 闭集，包里不能用。方案：本包导出 `GalleryTextKey`（字面量联合，约 60 个 key）+ 一份 zh 默认串（从 WeebPaint `strings.ts` 抄出这 60 条）；`deps.t` 由宿主实现，宿主把这 60 个 key 并进自己的 SSoT（WeebPaint 现成，WXHW 中英各补一遍）。宿主没实现的 key 落包内 zh 默认，**不许裸英文占位**。

## 7. 开放问题（要 user 拍）

1. **Vue**：`gallery.ts` 是 Vue 深模块。抽不重写 ⇒ 包依赖 Vue。选项：(a) `deps.vue` 注入宿主 vendored 的 Vue（WeebPaint 已有；WXHW / CatsUp 各 vendor 一份 prod ESM，约 150KB）；(b) 包自带一份 Vue（宿主若也用 Vue 就双份）；(c) 屏幕改 vanilla（= 重写，违背「抽」）。**推荐 (a)**。
2. **顺序**：本包的 UI 层依赖 `@internal/workbench-elements`（CatsUp 总账 A5，签名已 pin 在 WeebPaint `api/src/ui/*.d.ts` v0.13.15）。A5 要先出生，否则本包只能先出 core/。**推荐：A5 先，两包同一轮**。
3. **`DocHost.newDoc(spec: unknown)`**：spec 是 app 域（WeebPaint 画布模板 / WXHW 空 txt 或工程）。新建 sheet 的表单本身归谁？推荐：包出「名字 + 夹」两栏，app 域的附加表单（画布尺寸）由宿主经 `policy` 注入一段渲染回调。
4. 版本：`@internal/gallery` 首版号 0.1.0（出生即有消费者 = WeebPaint），按版本纪律过目 exports 后才写。

## 8. 落地顺序（本包内）

core/model + guards（纯，搬即绿）→ core/library + boot（有测试，搬即绿）→ core/thumbs + data-face（塑）→ storeUIFor（塑）→ ui/gallery-screen（塑，最重）→ ui/shell + manage + chip。每一步 `npm run build` 刷 `api/gallery.d.ts`，diff 给 user。WeebPaint 换成消费者是最后一步，红线测试不许退。
