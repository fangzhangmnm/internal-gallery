// @internal/gallery 测试入口（runner 抄 internal-store）。
import { run } from "./runner.mjs";
import "./setup.mjs";
import "./birth.test.mjs";
import "./gallery-model.test.mjs";
import "./gallery-view-model.test.mjs";
import "./cloud-image-model.test.mjs";
import "./first-frame-watchdog.test.ts";
import "./frame-gate.test.ts";
import "./diag-log.test.mjs";
import "./gallery-registry.test.mjs";
import "./gallery-attachment.test.mjs";
import "./resume-slate.test.mjs";
import "./boot-restore.test.ts";
import "./library-backup.test.mjs";
import "./change-password.test.mjs";
import "./data-face.test.mjs";
import "./aside.test.mjs";
import "./verbs.test.mjs";
import "./thumb-cache.test.mjs";
import "./facts-cache.test.mjs";
import "./encryption-state.test.mjs";   // 0.8.11 加密态取或 + 明文副产品作废
import "./sealed-cover.test.mjs";   // 0.8.12 锁上时解密得来的封面当场撤（周账 F-228）
import "./timeline-order.test.mjs";   // 0.8.12 时间线的顺序：文件夹进排序、不带日期的常驻最上面
import "./versions-fold.test.mjs";   // 0.9.0 存下来的一版的名字规则 + 收起的归组
import "./verbs-lock-star.test.mjs";   // 0.9.0 动词：解锁 / 星 / 收起 / 存一版 / 加密件复制不落明文
import "./png-text.test.mjs";
import "./make-thumb.test.mjs";
import "./templates-compiled.test.mjs";   // 0.8.4 预编译模板不许过期
run();
