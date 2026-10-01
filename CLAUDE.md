# 20260909 internal-gallery — 本库规则（@internal/gallery）

家族总规则见 `../CLAUDE.md`。这里只写本库特有的。created 2026-09-09 by Claude Fable 5.1（user 2026-09-09「新开 internal 仓」）。

- **本库 = 家族图库的户口本体**：文件管理（新建/改名/移动/删除/回收站/备份箱/复制）+ 多库路由（registry / attach / detach / 无库模式 / 本地夹 = 无地骑士）+ card view 一屏。**WeebPaint 的行为就是 spec**（user 2026-09-09），WXHW / CatsUp 对齐它；抽不重写（证据在家族根 `ai-docs/20260909-wxhw-2.0-long-haul-plan.md` §1）。
- **那一刀**：图库只认一个 `DocHost` 端口使唤编辑器；编辑器只发事件、不 import 图库。库的依赖只有四样注入：store 实例、`DocHost`、UI 原子（`@internal/workbench-elements`，CatsUp 总账 A5）、`t()`。**零 import 回宿主**——build lint 守。
- **红线兜底九件随模块搬、连测试一起**：删=回收站、冲突必弹、改名失败保输入重试、失败不报成功、dirty 不驱逐、pendingGone 有动作、首帧看门狗、黑匣子面包屑、restoreAttempt 断路器。它们是数据安全不是念旧。
- **只出货不送货**（同 internal-store）：`npm run release` 出 tgz；消费方在自家仓根跑 `scripts/pull-package.sh` 收货；宿主 pull，本库永不 push。
- **版本纪律**：开发期 `0.0.0`，不 tag 不出 tgz；版本号只在人类过目真实 exports（`api/gallery.d.ts` + pack 清单）通过后才写。**bump minor 之前必须 user 批准**（2026-09-19 user「所有的内部库想要bump minor之前都找我批准」；0.4.0 是 AI 未问自定的先例，别再来）。edited by Claude Fable 5.1 2026-09-19
- **API ritual**：现状 .h = WeebPaint `api/`（v0.14.x）；提案 .h = `ai-docs/20260909-proposal-api.md`，**user 过目前不搬模块**；实现中形状变了要回写提案。
- 测试 `npm test`，构建 `npm run build`（tsc → dist + api-extractor 户口）。`journal/` 人类区，AI 永不写。
- **回收站和备份箱是同一个抽象「搁置区」**（0.5.0，`src/core/model/aside.ts`；user 2026-09-29「回收站和备份箱是否应该抽象一下？关键在于不要引入会导致代码混淆的滥用和monkey patch」）：两者的差异只许写在 `ASIDE` 那一张表里，别处不写 `kind === "backup"` 分支；表不出包门牌；item 自带 kind；动作不看当前开着哪个视图。**文件管理类界面归本包，宿主不许绕过本包手写**（user 2026-09-29「绕过gallery手写备份逻辑=越狱」）；宿主专属的排版走窄槽（`ui.tilePlaceholderHtml` / `ui.tileOverlayHtml`），不进包。edited by Claude Fable 5.1 2026-09-29
- **身份的语法归 store（0.6.0）**：`GItem = { identifier, stem, kind, … }`；本包不再有 `naming` / `isDoc` / `isZipDoc` / `hasThumb` 钩子，切身份、拼身份一律 `store.identifiers`（parse / join）和 store 导出的 `withStemTail`。用词 identifier / folder / stem / suffix / kind 是 user 2026-09-29 逐词定的，**name 不再指任何精确的东西**（`AsideItem.box` 是箱子、`kind` 是文档种类，别混）。出处 = store 仓 `ai-docs/20260929-proposal-doc-types.md`。edited by Claude Fable 5.1 2026-09-29
- **弹层归深模块（0.6.2，2026-09-30）**：卡片 ⋯ 菜单不许住卡片里（卡片 `:hover` 的 `transform` 在 iOS 上粘住 → 卡片自成层叠上下文 → 菜单被下一排卡片盖住；user 真机截图「z order 系统的解决一下，看一下 weebpaint 怎么做的」）。规矩 = WeebPaint 的：**坐标 JS 算、fixed、z 走 band 表**——节点由 Vue `<Teleport>` 搬到挂载点（Vue 的 DOM 归 Vue 管，别 appendChild），生命周期 / 定位 / 外点关 / Escape / 栈 / 滚动收 全交 `@internal/workbench-elements` `toggleAdoptedPopup`（peer ≥0.1.1），z = `gallery.css` 的 `var(--z-menu, 400)`。宿主 `VueRuntime` 必须递 `Teleport`。以后包里任何新弹层都走这条路，不许再手搓 absolute + z-index。edited by Claude Fable 5.1 2026-09-30
- **卡片比例是一个数（0.7.0，2026-10-01）**：`tile.aspect?: number` = 宽 ÷ 高，不给 = 1（方图）；竖版（< 1）自动用更密的排法。包不认识任何具体的书封比例（0.2.0–0.6.x 的闭集 `"1/1" | "2/3"` 退役；user「改成只支持默认1:1和自定义可以吗」「版本号批」）。宿主传 `"2/3"` 的（WXHW、JRB）收货后改成数字。edited by Claude Fable 5.1 2026-10-01
