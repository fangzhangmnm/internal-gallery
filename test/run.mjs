// @internal/gallery 测试入口（runner 抄 internal-store：零依赖、实时耗时、每测 10s 超时墙）。
import { run } from "./runner.mjs";
import "./birth.test.mjs";
run();
