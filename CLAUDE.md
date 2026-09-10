# 20260909 internal-gallery — 本库规则（@internal/gallery）

家族总规则见 `../CLAUDE.md`。这里只写本库特有的。created 2026-09-09 by Claude Fable 5.1（user 2026-09-09「新开 internal 仓」）。

- **本库 = 家族图库的户口本体**：文件管理（新建/改名/移动/删除/回收站/复制）+ 多库路由（registry / attach / detach / 无库模式 / 本地夹 = 无地骑士）+ card view 一屏。**WeebPaint 的行为就是 spec**（user 2026-09-09），WXHW / CatsUp 对齐它；抽不重写（证据在家族根 `ai-docs/20260909-wxhw-2.0-long-haul-plan.md` §1）。
- **那一刀**：图库只认一个 `DocHost` 端口使唤编辑器；编辑器只发事件、不 import 图库。库的依赖只有四样注入：store 实例、`DocHost`、UI 原子（`@internal/workbench-elements`，CatsUp 总账 A5）、`t()`。**零 import 回宿主**——build lint 守。
- **红线兜底九件随模块搬、连测试一起**：删=回收站、冲突必弹、改名失败保输入重试、失败不报成功、dirty 不驱逐、pendingGone 有动作、首帧看门狗、黑匣子面包屑、restoreAttempt 断路器。它们是数据安全不是念旧。
- **只出货不送货**（同 internal-store）：`npm run release` 出 tgz；消费方在自家仓根跑 `scripts/pull-package.sh` 收货；宿主 pull，本库永不 push。
- **版本纪律**：开发期 `0.0.0`，不 tag 不出 tgz；版本号只在人类过目真实 exports（`api/gallery.d.ts` + pack 清单）通过后才写。
- **API ritual**：现状 .h = WeebPaint `api/`（v0.14.x）；提案 .h = `ai-docs/20260909-proposal-api.md`，**user 过目前不搬模块**；实现中形状变了要回写提案。
- 测试 `npm test`，构建 `npm run build`（tsc → dist + api-extractor 户口）。`journal/` 人类区，AI 永不写。
