# 提案 .h：`@internal/gallery` 0.3 —— 列表视图 + 副标题/角标 hook + 「留一份离线」动词（JRB 第三消费者）

> 作者：Claude Fable 5.1（claude-fable-5-1）· created 20260919 · as-of 0.2.2 · 状态：**待 user 过目**；过目通过前不写版本号、不 release（本包 CLAUDE.md 版本纪律）。
> 起因：JRB 现代化（`../../20260523 JustReadBooks/ai-docs/20260919-modernization-plan.md` §4.4）。user 2026-09-19：「关键是接gallery，而不是手搓。也许gallery需要支持第二种UI，然后考虑gallery变成全屏的，这样长书名也能显示」。
> 纪律：**WeebPaint 行为是 spec，默认值 = 现行为，WeebPaint / WXHW 零改动**（全部新字段可选）。
> **0.3.2 回写（2026-09-19 深夜，user「gallery 是前端…查一下还有什么切分错误的」）**：`policy.hide`（0.3.0）与 `onRenamed`（0.3.1）两个 hook **撤销**——「夹里有什么」是 store 列举面（`createStore({ hiddenName })`，store 0.14.0）；改名是身份变更、事件源在 store（`store.files.onRenamed`）。图库只画、只发起，不当数据源。

> **0.4.0 回写（2026-09-19 深夜，user「galleryItemFromStoreItem 把 store 的 9 态 syncState 映射成一堆布尔……将来 gallery 该直接吃 syncState。做」）**：`GItem` 改为 `{ name, syncState, size?, lastModified? }`——**唯一状态源 = store 的 syncState**，包内不再派生 `local / cloud / dirty / ghost / pendingGone / cloudNewer / newerOnCloud / conflict` 一堆布尔（那正是 store Item 注释警告的「下游重推导越狱」形状）。徽章 = `BADGE_OF: Record<SyncState, BadgeKind>` 一一对应；模板 / verbs 读状态只经三谓词 `hasLocalCopy / hasCloudCopy / cloudBytesNewer`（+`hasUnpushed`），登出视角压扁交给 store 的 ListContext，包不再重做。`GalleryTile` 加 `syncState / hasLocal / hasCloud / cloudNewer`，删文件项的 `cloud / hasLocalThumb`（回收站项 `TrashGItem/TrashTile` 保留 local/cloud——那是回收站元数据 trashKey / cloudItemId / 缩略图，不是同步态）。**宿主破坏性变更**：`tile.subtitle/marker/onOpen` 等 hook 收到的 item 没有 `local.size` 了——用 `item.size`。

## 0. 一句话

给 `GalleryScreenDeps.tile` 加一个 `layout: "list"`（一行一件、名字整行）和两个宿主 hook（副标题 / 未读角标），给 `DataFacePolicy` 加 `hide`（半成品 / 遗留 json 连杂物都不显示），给 verbs 加 `keepOffline`（纯云端件不打开就留一份离线）。全屏容器、上传入口、隐藏「新建」、「最近阅读」条**不进包**——它们是 chrome，按 0.1 提案 §3.1「chrome 标记留宿主」已定的边界（WXHW 的 `#galleryFull` 一屏就是宿主 CSS，包只出 `#galleryMount` 里面的东西）。

## 1. 现状 .h（0.2.2，`api/gallery.d.ts`）里已有、不重提

`tile.aspect "1/1"|"2/3"`、`ui.tilePlaceholderHtml`、`hasThumb`、`folderMemory`、`isGalleryVisible`、`naming.display`、verbs `unload`（= 移除离线副本）/ `push` / `reupload` / `del` / …、DocHost.open(item)。

## 2. 追加签名（全部可选；不给 = 0.2.2 行为字节不变）

```ts
// ── GalleryScreenDeps.tile（0.2.0 的 aspect 旁边加三个）──
tile?: {
  aspect?: "1/1" | "2/3";
  /** 0.3.0：布局。"cards" = 现行为（默认）。"list" = 一行一件：左小缩略图/占位图标（40px），中间名字**整行、最多折两行不截断**，
   *  第二行 = subtitle（若有）+ 元信息（大小/时间），右侧徽章列 + ⋯ 菜单。文件夹 / 图片 / 杂物 / 回收站同样成行。
   *  长书名（蒸馏卡 `2026-09-17 装订 《X》 作者 · 20 篇 / 15k 词 …`）在 2/3 卡片上没地方放，列表才是书架。 */
  layout?: "cards" | "list";
  /** 0.3.0：副标题（宿主域文本；JRB = 文件第一行状态头，WeebPaint 不给）。null/undefined = 不显示。cards 里排在 meta 行之前；list 里是第二行。 */
  subtitle?: (item: GItem) => string | null | undefined;
  /** 0.3.0：角标。"unread" = 名字前一枚圆点（.gallery-marker.unread，色 --accent，title = gal.marker.unread）。JRB：reading-position 无条目 = 未读。 */
  marker?: (item: GItem) => "unread" | null | undefined;
};

// ── DataFacePolicy（追加一个）──
/** 0.3.0：这些路径连杂物都不显示（JRB：v1 遗留 session.json / library.json、写入方半成品 *.part / ~* / .tmp）。不给 = 全显示（现行为）。
 *  放数据面而不是宿主过滤：帧是包算的，宿主拿不到「others」那一列。 */
hide?: (path: string) => boolean;

// ── GalleryHandle（追加两个，用户偏好即时切换；记不记住归宿主 device-kv）──
setLayout(l: "cards" | "list"): void;
getLayout(): "cards" | "list";

// ── verbs（createGalleryVerbs 返回值追加一个）──
/** 纯云端件「留一份离线」：不打开文档，经 host.busy(gal.busy.keepOffline) 调 VerbFile.keepOffline；成功 status gal.st.keptOffline。
 *  与现有 pullLocal（= openTile，打开即缓存）分工：pullLocal 是「读」，keepOffline 是「囤」（读者在 wifi 下把一晚要读的先囤好）。 */
keepOffline: (item: GItem) => Promise<void>;

// ── VerbFile（追加；store RawFile 0.13.0 已有同名面，宿主零适配）──
keepOffline(opts?: { onProgress?: (done: number, total: number) => void }): Promise<void>;
```

菜单变化（模板）：`badge==='cloudOnly'` 时在「拉到本地」旁加「留一份离线」（图标 `download`；缺专用图标则同 `download`，登记图标库 TODO）。其余菜单项不动。

文案新 key（`GALLERY_TEXT`，zh/en/ja 三语）：`gal.keepOffline`「留一份离线」/ `gal.busy.keepOffline`「正在下载「{name}」…」/ `gal.st.keptOffline`「已留离线：{name}」/ `gal.st.keepOfflineFail`「留离线失败：{e}」/ `gal.marker.unread`「未读」。

CSS（`gallery.css`，默认 cards 规则不动）：`.gallery-grid.list` = 纵向一列（`display:flex; flex-direction:column; gap:0; padding:0`）；`.gallery-grid.list .gallery-tile` = `display:grid; grid-template-columns: 40px minmax(0,1fr) auto; align-items:center; gap:10px; padding:8px 12px; border:0; border-bottom:1px solid var(--line); border-radius:0`，hover 不抬升；`.gallery-tile-thumb` 40px 宽按 `--tile-aspect`；`.gallery-tile-name` = `white-space:normal; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden`；`.gallery-tile-sub`（副标题）一行省略；徽章列 `.gallery-tile-badges` 靠右；⋯ 菜单钮进第三列（不再绝对定位盖在缩略图上）。窄屏（≤420px）第三列只留 ⋯，徽章并进第二行。

## 3. 不进包（宿主 chrome，按 0.1 提案 §3.1 边界）

- **全屏**：`#galleryFull` 一屏容器是宿主的（WXHW 2.0.1 已如此，`.gallery-full` 在宿主 styles.css）。JRB 同样一屏；包只保证 list 行在全宽下名字整行。
- **上传入口**：chrome 顶栏钮 + 拖放到 `#galleryFull`，动词 = store `file(name,{mode:"new"}).save(bytes,{tryPush})`（库红线；不是图库逻辑）。
- **隐藏「新建」**：宿主不渲染那颗钮。
- **「最近阅读」条**：跨夹的最近 N 本来自 JRB 的 `reading-position` collection，不在当前夹帧里（包政策「只订阅当前一层」）；宿主在 `#galleryMount` 上方画一条 chrome。若 user 想让它进包 → 需要 `DocHost.openName(name)` + `pinnedRows` 注入，另议。

## 4. 测试

- `test/verbs.test.mjs` 加 keepOffline：mock VerbFile 记录调用、host.busy 包裹、失败走 status 不抛。
- `test/gallery-view-model.test.mjs` 不动（subtitle/marker 是模板层）。
- 消费集成：WeebPaint / WXHW 不传新字段 → build 与 playwright 自查零变化；JRB 传 `layout:"list"` 当集成测试。

## 5. 版本

过目通过 → `0.3.0`（minor：新能力、无破坏）→ `release.sh` → GitHub release → JRB `pull-package.sh 0.3.0`。
