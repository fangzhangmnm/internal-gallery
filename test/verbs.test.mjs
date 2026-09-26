import { describe, it, eq, assert } from "./runner.mjs";
import { createGalleryVerbs } from "../src/core/verbs.ts";
import { t } from "../src/core/text.ts";

function mk({ file = {}, files = {}, inputs = [], confirms = [], active = null, signedIn = true, online = true } = {}) {
  const statuses = [], calls = [];
  const fileObj = (name, opts) => { calls.push(["file", name, opts]); return {
    tryMove: async (to) => { calls.push(["tryMove", name, to]); return file.tryMove ? file.tryMove(to) : { ok: true }; },
    delete: async () => file.delete ? file.delete() : { status: "ok", queuedCloudDelete: true },
    reupload: async () => file.reupload ? file.reupload() : { status: "ok" },
    getEncryptedBlob: async () => file.enc ?? null, open: async () => file.plain ?? null,
    save: async (b, o) => { calls.push(["save", name, opts, o]); },
    encrypt: async () => file.encrypt ? file.encrypt() : { status: "ok" }, decrypt: async () => ({ status: "ok" }),
    keepOffline: async () => { calls.push(["keepOffline", name]); if (file.keepOffline) return file.keepOffline(); },
  }; };
  const store = { file: fileObj, files: { nameOccupied: async () => false, deleteFolder: async (p) => files.deleteFolder?.(p), restoreTrash: async (o) => { calls.push(["restore", o]); return files.restore ? files.restore(o) : {}; }, purgeTrash: async (o) => { calls.push(["purge", o]); }, emptyTrash: async (o) => files.emptyTrash ? files.emptyTrash(o) : { failed: [] } } };
  const host = { signedIn: () => signedIn, online: () => online, activeName: () => active,
    confirm: async () => (confirms.length ? confirms.shift() : true), input: async (title, def) => { calls.push(["input", title, def]); return inputs.length ? inputs.shift() : null; },
    chooseFolder: async (_t, _m, opts) => (host._pick ? host._pick(opts) : opts[0]?.value ?? null), status: (m, e) => statuses.push([m, !!e]), busy: async (_l, fn) => fn() };
  const doc = { renameActive: async () => "x", setName: (n) => calls.push(["setName", n]), push: async () => calls.push(["push"]), unload: async () => {}, exit: async () => calls.push(["exit"]), dropCheckpoint: (n) => calls.push(["drop", n]) };
  const verbs = createGalleryVerbs({ store: () => store, host, doc, naming: { bare: (s) => s.replace(/\.ora$/, ""), full: (b) => `${b}.ora` } });
  return { verbs, statuses, calls, host };
}
const item = (name, extra = {}) => ({ name, syncState: "synced", ...extra });

describe("verbs · rename（改名失败保输入循环重试，错误写进重弹的标题）", () => {
  it("撞名 → 重问一次，默认值 = 上次输入，标题带占用位置；第二次 ok → 已改名", async () => {
    const { verbs, statuses, calls } = mk({ inputs: ["猫2", "猫3"], file: { tryMove: async (to) => (to === "猫2.ora" ? { ok: false, where: "cloud" } : { ok: true }) } });
    await verbs.rename(item("猫"));
    const inputCalls = calls.filter((c) => c[0] === "input");
    eq(inputCalls.length, 2);
    eq(inputCalls[1][2], "猫2", "重问时保留上次输入");
    assert(inputCalls[1][1].includes(t("gal.loc.cloud")), "标题说明占用位置在云端");
    eq(calls.filter((c) => c[0] === "tryMove").pop()[2], "猫3.ora", "边界转全名");
    eq(statuses.pop()[0], t("gal.st.renamed", { to: "猫3" }));
  });
  it("取消 → 已取消；同名 → 未变；空 → 重问", async () => {
    let r = mk({ inputs: [null] }); await r.verbs.rename(item("猫")); eq(r.statuses.pop()[0], t("gal.st.cancelled"));
    r = mk({ inputs: ["猫"] }); await r.verbs.rename(item("猫")); eq(r.statuses.pop()[0], t("gal.st.nameUnchanged"));
    r = mk({ inputs: ["  ", "新"] }); await r.verbs.rename(item("猫")); eq(r.calls.filter((c) => c[0] === "input").length, 2); eq(r.statuses.pop()[0], t("gal.st.renamed", { to: "新" }));
  });
  it("活动文档改名走编辑器（DocHost.renameActive），不碰 store", async () => {
    const { verbs, calls } = mk({ active: "猫" }); await verbs.rename(item("猫"));
    eq(calls.filter((c) => c[0] === "tryMove").length, 0);
  });
  // 0.4.1：身份 = 全名的宿主（WXHW：naming 恒等 + display 去扩展名）——改名只编辑主干，原扩展名自动保留（user 2026-09-26「重命名的时候不应该包含扩展名(.webxiaoheiwu.zip)」）
  const mkIdentity = (opts = {}) => {
    const r = mk(opts);
    const stem = (n) => n.replace(/(\.webxiaoheiwu\.zip|\.txt)$/i, "");
    // 同一套假 store/host/doc，只换 naming
    const store = { file: (name, o) => { r.calls.push(["file", name, o]); return { tryMove: async (to) => { r.calls.push(["tryMove", name, to]); return opts.file?.tryMove ? opts.file.tryMove(to) : { ok: true }; } }; }, files: {} };
    const verbs = createGalleryVerbs({ store: () => store, host: r.host, doc: { renameActive: async () => null, setName() {}, push: async () => {}, unload: async () => {}, exit: async () => {}, dropCheckpoint() {} }, naming: { bare: (s) => s, full: (b) => b, display: stem }, isZipDoc: (n) => /\.zip$/i.test(n) });
    return { ...r, verbs };
  };
  it("身份=全名 + display：默认值 = 去扩展名的主干；打「新名」→ tryMove 自动补回 .webxiaoheiwu.zip；toast 也只说主干", async () => {
    const { verbs, statuses, calls } = mkIdentity({ inputs: ["新名"] });
    await verbs.rename(item("旧书.webxiaoheiwu.zip"));
    eq(calls.find((c) => c[0] === "input")[2], "旧书", "输入框默认值不带扩展名");
    eq(calls.filter((c) => c[0] === "tryMove").pop()[2], "新名.webxiaoheiwu.zip", "★扩展名自动保留——删掉扩展名再确认不会把书改成无扩展名（以前会从书库消失）");
    eq(statuses.pop()[0], t("gal.st.renamed", { to: "新名" }));
  });
  it("身份=全名：用户自己把扩展名打全了不重复；只改大小写/同名 → 未变；txt 稿同理", async () => {
    let r = mkIdentity({ inputs: ["新名.webxiaoheiwu.zip"] }); await r.verbs.rename(item("旧书.webxiaoheiwu.zip"));
    eq(r.calls.filter((c) => c[0] === "tryMove").pop()[2], "新名.webxiaoheiwu.zip", "不重复后缀");
    r = mkIdentity({ inputs: ["旧书"] }); await r.verbs.rename(item("旧书.webxiaoheiwu.zip"));
    eq(r.statuses.pop()[0], t("gal.st.nameUnchanged")); eq(r.calls.filter((c) => c[0] === "tryMove").length, 0);
    r = mkIdentity({ inputs: ["日记二"] }); await r.verbs.rename(item("20260926-1a7a.txt"));
    eq(r.calls.filter((c) => c[0] === "tryMove").pop()[2], "日记二.txt", "txt 稿保 .txt");
  });
  it("身份=全名：撞名重问时默认值 = 上次输入的主干（不带扩展名）", async () => {
    const { verbs, calls } = mkIdentity({ inputs: ["猫2", "猫3"], file: { tryMove: async (to) => (to === "猫2.webxiaoheiwu.zip" ? { ok: false, where: "local" } : { ok: true }) } });
    await verbs.rename(item("猫.webxiaoheiwu.zip"));
    const inputCalls = calls.filter((c) => c[0] === "input");
    eq(inputCalls.length, 2); eq(inputCalls[1][2], "猫2", "重问默认值 = 主干");
    eq(calls.filter((c) => c[0] === "tryMove").pop()[2], "猫3.webxiaoheiwu.zip");
  });
  it("WeebPaint 式边界（bare/full，无 display）：行为不变——默认值 = 裸名，结果 = full(裸名)", async () => {
    const { verbs, calls } = mk({ inputs: ["新"] }); await verbs.rename(item("猫"));
    eq(calls.find((c) => c[0] === "input")[2], "猫"); eq(calls.filter((c) => c[0] === "tryMove").pop()[2], "新.ora");
  });
});

describe("verbs · del（删=回收站；DelResult 诚实读）", () => {
  it("cancelled → 报取消、不 exit；noop / 只删本地 → 错误样式；ok → 已删除；活动项 → exit + dropCheckpoint", async () => {
    let r = mk({ file: { delete: async () => ({ status: "cancelled" }) }, active: "a" }); await r.verbs.del(item("a"));
    eq(r.statuses.pop()[0], t("gal.st.delCancelled", { name: "a" })); eq(r.calls.filter((c) => c[0] === "exit").length, 0);
    r = mk({ file: { delete: async () => ({ status: "noop" }) } }); await r.verbs.del(item("a")); eq(r.statuses.pop().join(), `${t("gal.st.delNothing", { name: "a" })},true`);
    r = mk({ file: { delete: async () => ({ status: "ok", queuedCloudDelete: false }) } }); await r.verbs.del(item("a")); eq(r.statuses.pop().join(), `${t("gal.st.delLocalOnly", { name: "a" })},true`);
    r = mk({ active: "a" }); await r.verbs.del(item("a"));
    eq(r.statuses.pop().join(), `${t("gal.st.deleted", { name: "a" })},false`);
    eq(r.calls.filter((c) => c[0] === "exit").length, 1); eq(r.calls.filter((c) => c[0] === "drop").length, 1);
  });
  it("用户在确认框点否 → 什么都不做", async () => { const r = mk({ confirms: [false] }); await r.verbs.del(item("a")); eq(r.statuses.length, 0); eq(r.calls.length, 0); });
});

describe("verbs · move（目标只有上级 + 可见子夹，根置顶，绝不 poll 全树）", () => {
  it("在 A/B 里：目标 = [A, A/B/c, A/B/d]（排除当前夹）；根目录时无上级", () => {
    const { verbs } = mk();
    eq(verbs.moveTargets(item("A/B/x"), { folder: "A/B", folderNames: ["d", "c"] }).join("|"), "A|A/B/c|A/B/d");
    eq(verbs.moveTargets(item("x"), { folder: "", folderNames: [] }).length, 0);
    eq(verbs.moveTargets(item("A/x"), { folder: "A", folderNames: ["sub"] }).join("|"), "|A/sub", "上级是根 → 空串置顶");
  });
  it("没有可去的夹 → 状态说明；撞名 → 错误样式；成功且是活动文档 → setName", async () => {
    let r = mk(); await r.verbs.move(item("x"), { folder: "", folderNames: [] }); eq(r.statuses.pop()[0], t("gal.st.noOtherFolder"));
    r = mk({ file: { tryMove: async () => ({ ok: false, where: "local" }) } }); await r.verbs.move(item("x"), { folder: "", folderNames: ["sub"] }); eq(r.statuses.pop()[1], true);
    r = mk({ active: "x" }); await r.verbs.move(item("x"), { folder: "", folderNames: ["sub"] });
    eq(r.calls.find((c) => c[0] === "setName")[1], "sub/x"); eq(r.statuses.pop()[1], false);
  });
});

describe("verbs · copy / reupload / emptyTrash / trashRestore", () => {
  it("copy：加密源原样搬密文（不 open）；目标名同夹「副本」按当前夹去重；新身份 mode:new，tryPush 跟登录+在线", async () => {
    const enc = new Blob(["CIPHER"]);
    const r = mk({ file: { enc, plain: new Blob(["PLAIN"]) } });
    await r.verbs.copy(item("夹/猫"), ["夹/猫", `夹/猫 ${t("name.copySuffix")}`]);
    const save = r.calls.find((c) => c[0] === "save");
    eq(save[1], `夹/猫 ${t("name.copySuffix")}2.ora`); eq(save[2].mode, "new"); eq(save[3].tryPush, true);
    eq(r.statuses.pop()[1], false);
  });
  it("reupload：no-local → 错误；撞名异常 → 冲突文案；ok → 已重传", async () => {
    let r = mk({ file: { reupload: async () => ({ status: "no-local" }) } }); await r.verbs.reupload(item("a")); eq(r.statuses.pop()[1], true);
    r = mk({ file: { reupload: async () => { const e = new Error("x"); e.name = "CloudNameCollisionError"; throw e; } } }); await r.verbs.reupload(item("a")); eq(r.statuses.pop()[0], t("gal.st.reuploadConflict", { name: "a" }));
    r = mk(); await r.verbs.reupload(item("a")); eq(r.statuses.pop()[0], t("gal.st.reuploaded", { name: "a" }));
  });
  it("emptyTrash：云端失败必说；只本地失败 → 部分；全成 → 完成；cloud scope 离线 → 要登录", async () => {
    let r = mk({ files: { emptyTrash: async () => ({ failed: [{ where: "cloud" }, { where: "local" }] }) } }); await r.verbs.emptyTrash("both"); eq(r.statuses.pop()[0], t("gal.st.emptyTrashCloudFail", { n: 1 }));
    r = mk({ files: { emptyTrash: async () => ({ failed: [{ where: "local" }] }) } }); await r.verbs.emptyTrash("local"); eq(r.statuses.pop()[0], t("gal.st.emptyTrashPartial"));
    r = mk(); await r.verbs.emptyTrash("local"); eq(r.statuses.pop()[1], false);
    r = mk({ online: false }); await r.verbs.emptyTrash("cloud"); eq(r.statuses.pop()[0], t("gal.st.emptyTrashCloudNeedLogin"));
  });
  it("trashRestore：目标转全名、加密旗透传；库改名恢复 → 文案说明新名", async () => {
    const r = mk({ files: { restore: async () => ({ name: "a 1.ora" }) } });
    await r.verbs.trashRestore({ name: "a", local: { trashKey: "k" }, cloud: { id: "c" }, encrypted: true });
    const o = r.calls.find((c) => c[0] === "restore")[1];
    eq(o.targetName, "a.ora"); eq(o.encrypted, true); eq(o.trashKey, "k"); eq(o.cloudRef, "c");
    eq(r.statuses.pop()[0], t("gal.st.restoredRenamed", { name: "a 1", orig: "a" }));
  });
});

describe("verbs · encrypt（首次创建的密码只有加密成功才算数）", () => {
  it("加密抛错且是首次设密码 → rollbackFreshPassword；成功 → 不回滚 + 缩略图失效 + 加密态变更回调", async () => {
    const log = [];
    const enc = { ensureUnlocked: async () => true, ensureNewPassword: async () => "pw", isFreshPasswordSetup: () => true, rollbackFreshPassword: () => log.push("rollback"), setPassword: () => log.push("set") };
    const base = mk();
    let v = createGalleryVerbs({ store: () => ({ file: (n, o) => ({ ...base.verbs, encrypt: async () => { throw new Error("boom"); }, tryMove: async () => ({ ok: true }) }), files: {} }), host: base.host, doc: { renameActive: async () => null, setName() {}, push: async () => {}, unload: async () => {}, exit: async () => {}, dropCheckpoint() {} }, encryption: enc, thumbs: { invalidate: () => log.push("inv") }, onEncryptionChanged: () => log.push("changed") });
    await v.encryptItem(item("a"));
    eq(log.join(","), "set,rollback");
    log.length = 0;
    v = createGalleryVerbs({ store: () => ({ file: () => ({ encrypt: async () => ({ status: "ok" }) }), files: {} }), host: base.host, doc: { renameActive: async () => null, setName() {}, push: async () => {}, unload: async () => {}, exit: async () => {}, dropCheckpoint() {} }, encryption: enc, thumbs: { invalidate: () => log.push("inv") }, onEncryptionChanged: () => log.push("changed") });
    await v.encryptItem(item("a"));
    eq(log.join(","), "set,inv,changed");
  });
});

describe("verbs · keepOffline（0.3.0，JRB：纯云端件不打开就囤一份）", () => {
  it("调 VerbFile.keepOffline（全名）、经 busy、成功 status 已留离线", async () => {
    const { verbs, statuses, calls } = mk();
    await verbs.keepOffline(item("猫", { syncState: "cloud-only" }));
    eq(calls.filter((c) => c[0] === "keepOffline").pop()[1], "猫.ora", "边界转全名");
    eq(statuses.pop()[0], t("gal.st.keptOffline", { name: "猫" }));
  });
  it("失败走 status（isError）不抛", async () => {
    const { verbs, statuses } = mk({ file: { keepOffline: async () => { throw new Error("offline"); } } });
    await verbs.keepOffline(item("猫", { syncState: "cloud-only" }));
    const last = statuses.pop(); eq(last[1], true); eq(last[0], t("gal.st.keepOfflineFail", { e: "offline" }));
  });
});
