// 0.8.4：src/ui/templates.compiled.ts 必须是 src/ui/templates.ts 当前内容的编译结果（改了模板忘了 build = 红），且编译产物不再求值字符串。created 2026-10-17 by Claude Opus 5.5
import { readFileSync } from "node:fs";
import { describe, it, assert } from "./runner.mjs";
import { generate } from "../scripts/compile-templates.mjs";

describe("templates-compiled", () => {
  it("生成物和模板源一致（改模板后要 npm run build）", async () => {
    const cur = readFileSync(new URL("../src/ui/templates.compiled.ts", import.meta.url), "utf8");
    assert(cur === (await generate()), "src/ui/templates.compiled.ts is stale — run npm run build");
  });
  it("编译产物里没有 new Function / eval / with", () => {
    const cur = readFileSync(new URL("../src/ui/templates.compiled.ts", import.meta.url), "utf8");
    assert(!/\bnew Function\b|\beval\s*\(|\bwith\s*\(/.test(cur));
  });
});
