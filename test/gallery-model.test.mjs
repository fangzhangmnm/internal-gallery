// Gallery 路径代数 + 展示纯函数验收（A2 出生；C3 瘦身：merge/slice/classify 系列已被 store 库收编，
// 锚随迁 store 侧测试——listing/trash-merge/reconcile/store-folder-listing）。纯数据。
import { describe, it, eq, assert } from "./runner.mjs";
import { pathFolder, pathBasename, pathJoin } from "../src/core/model/gallery-path.ts";
import { copyTargetName, uniqueIdentifier } from "../src/core/model/gallery-model.ts";
import { createIdentifiers } from "@internal/store";
// 0.6.0：裸名边界退役；用例按 WeebPaint 的种类表跑（身份 = `X.ora`），主干 / 后缀由 store.identifiers 切。
const WP = createIdentifiers([{ kind: "painting", suffix: ".ora", container: "zip" }]);

describe("gallery-path", () => {
  it("pathFolder", () => { eq(pathFolder("a"), ""); eq(pathFolder("f/a"), "f"); eq(pathFolder("f/g/a"), "f/g"); });
  it("pathBasename", () => { eq(pathBasename("a"), "a"); eq(pathBasename("f/g/a"), "a"); });
  it("pathJoin", () => { eq(pathJoin("", "a"), "a"); eq(pathJoin("f", "a"), "f/a"); eq(pathJoin("f", ""), "f"); });
});

describe("gallery-model · copyTargetName（复制的目标身份：主干后接「副本」，后缀不动）", () => {
  it("未占用 → 「主干 copy」；占用 → copy2 / copy3…；文件夹保留", () => {
    eq(copyTargetName("猫.ora", () => false, WP), "猫 copy.ora");
    const taken = new Set(["猫 copy.ora", "猫 copy2.ora"]);
    eq(copyTargetName("猫.ora", (n) => taken.has(n), WP), "猫 copy3.ora");
    eq(copyTargetName("插画/猫.ora", () => false, WP), "插画/猫 copy.ora");
    eq(copyTargetName("猫 copy.ora", () => false, WP), "猫 copy copy.ora");
  });
  it("后缀不动：名字带多段后缀的宿主复制出来仍是同一种文档（0.5.x 是 `书.webxiaoheiwu.zip 副本`）", () => {
    const wx = createIdentifiers([{ kind: "book", suffix: ".webxiaoheiwu.zip", container: "zip" }, { kind: "draft", suffix: ".txt", container: "raw" }]);
    eq(copyTargetName("书.webxiaoheiwu.zip", () => false, wx), "书 copy.webxiaoheiwu.zip");
    eq(wx.parse(copyTargetName("书.webxiaoheiwu.zip", () => false, wx)).kind, "book");
    eq(copyTargetName("稿.txt", () => false, wx), "稿 copy.txt");
  });
  it("非文档（图片）按最后一个点", () => {
    eq(copyTargetName("pic.png", () => false, WP), "pic copy.png");
  });
});

// v0.10.4：uniqueBareName——「不静默覆盖旧画」链的 app 侧兜底层（第 1 层=调用方预检、
// 第 3 层=store mode:"new" 首存护栏抛 CloudNameCollisionError，后者 pin 在库仓
// store-folder-listing/cloud-sync 测试；editor-session 的 mode 传递 pin 在 editor-session.test）。
describe("gallery-model · uniqueIdentifier（撞名后缀兜底；0.6.0 收身份，原 uniqueBareName）", () => {
  const occupiedSet = (...names) => async (id) => names.includes(id);

  it("未占用 → 原身份直用；占用谓词收到的就是身份", async () => {
    const asked = [];
    const id = await uniqueIdentifier("猫.ora", async (n) => { asked.push(n); return false; }, WP);
    eq(id, "猫.ora"); eq(asked.length, 1); eq(asked[0], "猫.ora");
  });
  it("占用 → 依次试「主干 1」「主干 2」…后缀不动，取首个空位", async () => {
    eq(await uniqueIdentifier("猫.ora", occupiedSet("猫.ora"), WP), "猫 1.ora");
    eq(await uniqueIdentifier("猫.ora", occupiedSet("猫.ora", "猫 1.ora", "猫 2.ora"), WP), "猫 3.ora");
  });
  it("带夹路径整个参与占用检查（孪生 nameOverride 场景：夹A/foo）", async () => {
    eq(await uniqueIdentifier("夹A/foo.ora", occupiedSet("夹A/foo.ora"), WP), "夹A/foo 1.ora");
  });
  it("恒占用（1+19 个候选全撞）→ 时间戳兜底，绝不返回已占用身份", async () => {
    const asked = [];
    const id = await uniqueIdentifier("X.ora", async (n) => { asked.push(n); return true; }, WP);
    eq(asked.length, 20, "身份 + 19 个后缀候选全试过");
    assert(/^X \d{12,}\.ora$/.test(id), `时间戳兜底形状（得到 ${id}）`);
  });
});
