// 构建时把 src/ui/templates.ts 的三张 Vue 模板编成 render 函数 → src/ui/templates.compiled.ts（生成物进仓）。created 2026-10-17 by Claude Opus 5.5
// 为什么：宿主页面开了 CSP（user 2026-10-17「csp…一起上」，不放行 eval）时，Vue 在运行时编译模板要 `new Function`，会被拦，书库打不开。
//   编译器 = @vue/compiler-dom 的 prod 构建，版本钉死 = 家族各 app vendor 的 Vue 运行时版本（vendor/vue/VERSION）。版本对不上 = 拒绝生成。
// 用法：node scripts/compile-templates.mjs（build.sh 先跑它）；node scripts/compile-templates.mjs --check = 只比对、不写（测试用）。
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const VUE_VERSION = "3.5.35";
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = `${ROOT}src/ui/templates.compiled.ts`;
const require = createRequire(import.meta.url);

export async function generate() {
  const pkg = JSON.parse(readFileSync(require.resolve("@vue/compiler-dom/package.json"), "utf8"));
  if (pkg.version !== VUE_VERSION) throw new Error(`@vue/compiler-dom is ${pkg.version}, expected ${VUE_VERSION} (must equal the Vue runtime the apps vendor)`);
  const { compile } = require("@vue/compiler-dom/dist/compiler-dom.cjs.prod.js");
  const T = await import(`${ROOT}src/ui/templates.ts`);
  const parts = { thumbCell: T.THUMB_CELL_TEMPLATE, imageThumbCell: T.IMAGE_THUMB_CELL_TEMPLATE, gallery: T.GALLERY_TEMPLATE };
  const helpers = new Set();
  let body = "";
  for (const [name, tpl] of Object.entries(parts)) {
    if (typeof tpl !== "string" || !tpl.trim()) throw new Error(`template ${name} missing`);
    const r = compile(tpl, { mode: "function", prefixIdentifiers: true, hoistStatic: true, cacheHandlers: true, comments: false });
    const m = r.code.match(/^const \{ ([^}]*) \} = Vue/m);
    if (m) for (const pair of m[1].split(",")) helpers.add(pair.split(":")[0].trim());
    if (/\bnew Function\b|\beval\s*\(|\bwith\s*\(/.test(r.code)) throw new Error(`compiled ${name} still evaluates strings`);
    body += `\nexport function ${name}Render(Vue: any): any {\n${r.code.replace(/^/gm, "  ")}\n}\n`;
  }
  return `// 生成物 —— scripts/compile-templates.mjs 自 src/ui/templates.ts 编译（@vue/compiler-dom ${VUE_VERSION} prod）。勿手改：改模板后 npm run build。
// 用途：宿主把整个 Vue 模块递进来时（VueRuntime 里有下面 HELPERS 的全部），图库用这些 render 函数、运行时不编译模板 = CSP 不用放行 eval。0.8.4
/* eslint-disable */
// @ts-nocheck
export const COMPILED_WITH_VUE = "${VUE_VERSION}";
/** render 函数要从宿主的 Vue 里拿的 helper；缺任何一个 = 退回运行时编译。 */
export const HELPERS: readonly string[] = ${JSON.stringify([...helpers].sort())};
${body}`;
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) {   // 路径里有空格：比解码后的路径，不比 URL
  const code = await generate();
  if (process.argv.includes("--check")) {
    const cur = readFileSync(OUT, "utf8");
    if (cur !== code) { console.error("[compile-templates] ✗ src/ui/templates.compiled.ts is stale — run npm run build"); process.exit(1); }
    console.log("[compile-templates] up to date");
  } else {
    writeFileSync(OUT, code);
    console.log(`[compile-templates] wrote src/ui/templates.compiled.ts (${(code.length / 1024).toFixed(1)} KB)`);
  }
}
