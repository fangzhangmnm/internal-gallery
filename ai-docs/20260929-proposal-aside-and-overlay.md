# 提案 0.5.0：回收站 + 备份箱合成「搁置区」；封面覆盖层 hook
> created 20260929 · by Claude Fable 5.1 · as-of 0.5.0
> 状态：**已批、已发版 0.5.0**（user 2026-09-29「gammery当然要升」，说的是 gallery）。下文保留提案时的写法。edited by Claude Fable 5.1 2026-09-29

## 1. 起因（user 2026-09-29 原话）

- 「备份箱界面可以做了，weebpaint有做吗？…gallery有备份箱吗？我们这个模块可以和gallery合并吗 gallery深模块你看一下怎么合并才能不让各种fancy gui逻辑进去」
- 「备份箱应该是gallery的功能」「不要自己越狱做备份箱。绕过gallery手写备份逻辑=越狱」
- 「回收站和备份箱是否应该抽象一下？关键在于不要引入会导致代码混淆的滥用和monkey patch」
- 「带图的能不能不要做底栏而就是图是fit all然后字还是一样的，就是字的逻辑一样，无视是否有图，图只是背景」

现状：全家族没有一个 app 有备份箱界面（WeebPaint 只有开发者控制台的 `WP.listBackup` / `WP.emptyBackup`）。
store 早就把两端聚合的备份箱列表、恢复、彻底删、清空都做好了，形状和回收站一模一样（库内部就是 `aggregateBox("trash" | "backup")`）。缺的只是界面。

## 2. 抽象：搁置区（aside）

回收站和备份箱是同一个东西：被挪到一边的文件。删除的进 `.trash`，冲突里被换下的那一版进 `.backup`。

| 规矩 | 落在哪 |
|---|---|
| 闭集 `AsideKind = "trash" \| "backup"` | `src/core/model/aside.ts` |
| 两者的全部差异在一张表 `ASIDE` 里：读哪个列表、清空调哪个、九个文案 key、缩略图来源 | 同上；表**不出包门牌**、运行时冻结 |
| 每个 item 自带 `kind` 和列表内唯一的 `key` | `AsideItem` |
| 恢复 / 彻底删从 item 读两把钥匙（`localKey` / `cloudRef`），不看当前开着哪个视图 | `verbs.asideRestore` / `asidePurge` |
| 列表只来自 store，宿主没有注入口 | `data.listAside(kind)` |
| handle 上 `emptyTrash` 只清回收站、`emptyBackup` 只清备份箱 | `GalleryHandle` |

两处差异值得说一下：

- **缩略图**。回收站照旧按名字走缩略图缓存（原名通常已经没有活文件，缓存里是删之前那张）。备份箱**不取**：原名的活文件几乎总在，按名字取到的是现在那一版的图，当成留底那一版的图是骗人。
- **`conflictLive`** 只回收站有意义，备份箱这一位 store 恒给 false，本包原样带出、不自己判。

顺手修掉回收站两处旧毛病（0.4.1 及以前一直在）：

| 毛病 | 原因 | 现在 |
|---|---|---|
| 回收站每一条都显示「未知时间 删除」 | 数据面把 `deletedAt` 写死成 0，store 给的时间戳没用上 | 解析 store 的 `yyyymmddhhmmss` 戳 |
| 同名的两条列表 key 相撞（菜单开合串位） | key = 名字 + 恒为 0 的时间 | key = kind + 两把钥匙 |

## 3. 封面覆盖层 hook：`ui.tileOverlayHtml(name)`

盖在文档卡片封面上的一层宿主 HTML，**有没有缩略图都画**。包只给一个槽：铺满封面、不吃指针事件、紧跟在缩略图元素后面。
里面画什么、怎么排版全归宿主；包不因为有没有这一层改变任何别的行为。文件 / 回收站 / 备份箱卡片走它；文件夹、图片、杂物卡片不走；列表布局不画。

这就是「fancy gui 逻辑不进包」的那条线：WXHW 的竖排书名、纵中横、装订线、描边全在 WXHW 自己的 `src/ui/book-cover.ts` 和 `styles.css`。
原有的 `ui.tilePlaceholderHtml`（没有缩略图时的占位）不变。

## 4. 为什么不是 patch

1. 新增一个用户看得见的视图（备份箱）和一个新的宿主 hook。
2. **删了对外导出**：`TrashGItem`、`TrashTile`、`trashTileFor`、`LocalSessionMeta`、`CloudFileMeta`。
3. **改了对外导出的名字**：`verbs.trashRestore / trashPurge / emptyTrash` → `asideRestore / asidePurge / emptyAside`；`data.listTrash` → `listAside`。

2 和 3 没留旧名别名（别名就是兼容层）。四个消费者（WeebPaint / WXHW / CatsUp / JRB）我逐个 grep 过：**没有一个用到被删、被改名的东西**，它们只碰 handle 的 `setView` / `getView` / `emptyTrash`，这三个签名向后兼容。所以收货 0.5.0 时四家零改动就能编译；要备份箱的才加外壳。

## 5. api 差异摘要（全文：`git diff v0.4.1..wip/0.5-backup-box -- api/gallery.d.ts`）

```diff
+export declare type AsideKind = "trash" | "backup";
+export declare type AsideScope = "local" | "cloud" | "both";
+export declare interface AsideItem { kind; key; name; at; side; localKey; cloudRef; encrypted; conflictLive }
+export declare interface AsideTile { key; name; at; source }
+export declare function asideTileFor(item: AsideItem): AsideTile;
+export declare function fullTime(ts: number): string;
+export declare type GalleryView = "files" | AsideKind;

 createGalleryDataFace(...):
-    listTrash: () => Promise<TrashGItem[]>;
+    listAside: (kind: AsideKind) => Promise<AsideItem[]>;

 createGalleryVerbs(...):
-    trashRestore / trashPurge / emptyTrash(scope?)
+    asideRestore(item) / asidePurge(item) / emptyAside(kind, scope?)

 GalleryHandle:
-    setView(v: "files" | "trash"): void;   getView(): "files" | "trash";
+    setView(v: GalleryView): void;         getView(): GalleryView;
     emptyTrash(scope?): void;
+    emptyBackup(scope?): void;

 GalleryScreenDeps.ui:
+    tileOverlayHtml?: (name: string) => string | undefined;

 DataFaceStore.files:  + listBackup()
 VerbStore.files:      + emptyBackup()

-export declare interface TrashGItem / TrashTile / LocalSessionMeta / CloudFileMeta
-export declare function trashTileFor
```

文案表加 9 个 key（zh / en / ja）：`gal.empty.backup`、`gal.keptAside`、`gal.dlg.emptyBackupTitle` / `Msg`、`gal.busy.emptyBackup`、`gal.st.emptyBackupDone` / `CloudNeedLogin` / `CloudFail` / `Partial`。宿主不接管就落包内默认。

对 store 的要求没变：`peerDependencies` 仍是 `>=0.13.0`（`listBackup` / `emptyBackup` 那时就有）。

## 6. 其余行为变化

| 变化 | 以前 |
|---|---|
| 搁置区列表读失败 → 停在「读取失败 + 重试」 | 未处理的 rejection，界面像空列表 |
| 清空时 store 抛错 → 状态栏报失败 | 未处理的 rejection |
| 连点切换视图有序号守卫，晚到的旧结果不盖新视图 | 没有 |
| 搁置区卡片的名字走 `naming.display`（和文件卡片同一个显示名） | 直接显示全名 |
| 搁置区取缩略图尊重宿主的 `hasThumb` | 不看 |

## 7. 验证

| 项 | 结果 |
|---|---|
| 包测试 | 175 项全过（新增 `test/aside.test.mjs`，动词测试改到新形状并补了备份箱） |
| WXHW 界面审计（无头 Chromium，1280x800 和 400x800） | 全部探针通过，含新加的「封面图只是背景」探针 |
| WXHW 两台设备端到端 | 11 个场景零失败，其中 3 个走备份箱界面 |

包里的 Vue 界面没有自己的浏览器测试，界面这一层是靠 WXHW 的审计和端到端验的。真机没测过。WeebPaint / CatsUp / JRB 没有拿未发版构建跑过（只做了 grep 级的兼容核对）。

## 8. 发版之后

WXHW 收货的接线已在 WXHW 分支 `wip/backup-box` 写好并验过；它同时依赖 store 的 `docExts`（另一份提案，库仓 `20260813 internal-store/ai-docs/20260929-proposal-doc-exts.md`），那边没定之前 WXHW 不并 main。
其余三家（WeebPaint / CatsUp / JRB）收货 0.5.0 应当零改动就能编译；要不要上备份箱外壳，各家自己的 session 定。

宿主接备份箱的最小外壳（WXHW 的写法）：一个入口钮 + 一条栏（回到文件 / 回收站和备份箱两个页签 / 清空），
分别调 `handle.setView("trash" | "backup" | "files")`、`handle.emptyTrash(scope)` / `handle.emptyBackup(scope)`。列表、恢复、彻底删、确认框、结果提示都是包的。
