// 0.9.0 动词：解锁 / 锁上、加星 / 撤星、收起、存一版 / 存到上一版、删除遇到星、复制加密件不落明文。created 2026-11-08 by Claude Fable 5.1
// user 2026-11-08：「手动存…你这个的语义就是复制一份」「手动存档的时候，我们可以存上一个版本，也可以存新版本」「你要删之前，你必须得先把星星给撤掉」
//   「我们没有彻底删…是进了回收站之后才能彻底删」。
import { describe, it, eq, assert } from "./runner.mjs";
import { createGalleryVerbs } from "../src/core/verbs.ts";
import { t } from "../src/core/text.ts";
import { createIdentifiers } from "@internal/store";
const IDS = createIdentifiers([{ kind: "painting", suffix: ".ora", container: "zip" }]);
const item = (identifier, extra = {}) => { const d = IDS.parse(identifier); return { identifier, stem: d.stem, kind: d.kind, syncState: "synced", ...extra }; };
const blob = (s, type = "") => new Blob([s], { type });
class StarredError extends Error { constructor() { super("starred"); this.name = "StarredError"; } }
class CloudNameCollisionError extends Error { constructor() { super("occupied"); this.name = "CloudNameCollisionError"; } }

/** 假库：files[identifier] = { enc?, plain?, starred?, pullsContainer? }；记下每一步（顺序要紧：先存新的再丢旧的）。 */
function mk({ files = {}, active = null, marks = true, lock = true, cloudOccupied = [], signedIn = true, flush = true } = {}) {
  const log = [], statuses = [];
  const store = {
    identifiers: IDS,
    file: (identifier, opts) => ({
      getEncryptedBlob: async () => files[identifier]?.enc ?? null,
      open: async () => { const f = files[identifier]; if (f?.pullsContainer) { f.enc = f.pullsContainer; f.pullsContainer = null; } return f?.plain ?? null; },
      save: async (b, o) => { if (cloudOccupied.includes(identifier)) throw new CloudNameCollisionError(); log.push(["save", identifier, opts.mode, o, await b.text()]); files[identifier] = { plain: b }; },
      trash: async () => { if (files[identifier]?.starred) throw new StarredError(); log.push(["trash", identifier]); delete files[identifier]; return { status: "trashed", queuedCloudDelete: true }; },
      resolve: async () => files[identifier]?.resolve ?? { status: "pushed" },
      tryMove: async () => ({ ok: true }), encrypt: async () => ({ status: "ok" }), decrypt: async () => ({ status: "ok" }), keepOffline: async () => {},
    }),
    files: { occupied: async () => false, deleteFolder: async () => {}, restoreTrash: async () => ({}), purgeTrash: async () => {}, emptyTrash: async () => ({ failed: [] }), emptyBackup: async () => ({ failed: [] }),
      ...(lock ? { lockByDefault: true, unlock: async (id) => { log.push(["unlock", id]); return { identifier: id }; }, lock: async (id) => { log.push(["lock", id]); } } : {}),
      ...(marks ? { fileMarks: true, star: async (id) => { log.push(["star", id]); }, unstar: async (id) => { log.push(["unstar", id]); }, fold: async (id) => { log.push(["fold", id]); }, unfold: async (id) => { log.push(["unfold", id]); } } : {}) },
  };
  const host = { signedIn: () => signedIn, online: () => true, activeIdentifier: () => active, confirm: async () => { log.push(["confirm"]); return true; }, input: async () => null, chooseFolder: async () => null,
    status: (m, e) => statuses.push([m, !!e]), busy: async (_l, fn) => fn() };
  const doc = { renameActive: async () => null, setIdentifier: () => {}, push: async () => {}, unload: async () => {}, exit: async () => { log.push(["exit"]); }, dropCheckpoint: () => {},
    ...(flush ? { flush: async () => { log.push(["flush"]); } } : {}) };
  return { verbs: createGalleryVerbs({ store: () => store, host, doc }), log, statuses, files };
}
const NOW = new Date(2026, 10, 8, 22, 0);
const ops = (log) => log.map((l) => `${l[0]}:${l[1] ?? ""}`).join(" > ");

describe("verbs · 存一版", () => {
  it("存成新的一版：同夹、<主干>.backup-<今天>、新建（不覆盖）、生来锁着；原作一个字节不动", async () => {
    const r = mk({ files: { "夹/猫.ora": { plain: blob("画") } } });
    const got = await r.verbs.saveVersion(item("夹/猫.ora"), "new", [item("夹/猫.ora")], { now: NOW });
    eq(got, "夹/猫.backup-20261108.ora");
    const save = r.log.find((l) => l[0] === "save");
    eq(save[1], "夹/猫.backup-20261108.ora"); eq(save[2], "new", "走 mode:new = 库保证不覆盖同名"); eq(save[3].bornLocked, true, "存下来的一版生来锁着"); eq(save[4], "画");
    eq(ops(r.log), "save:夹/猫.backup-20261108.ora", "没有删任何东西");
    eq(r.statuses.pop()[0], t("gal.st.versionSaved", { name: "猫.backup-20261108" }));
  });
  it("同一天再存：-2、-3；名字在列表之外被占（云端有、帧还没到）→ 库拒绝覆盖，换下一个序号", async () => {
    const sib = [item("猫.ora"), item("猫.backup-20261108.ora")];
    const r = mk({ files: { "猫.ora": { plain: blob("画") } }, cloudOccupied: ["猫.backup-20261108-2.ora"] });
    eq(await r.verbs.saveVersion(item("猫.ora"), "new", sib, { now: NOW }), "猫.backup-20261108-3.ora");
  });
  it("存到上一版：先存成新的，成了才把上一份送进回收站（顺序不能反）", async () => {
    const sib = [item("猫.ora"), item("猫.backup-20261101.ora"), item("猫.backup-20261105.ora")];
    const r = mk({ files: { "猫.ora": { plain: blob("画") }, "猫.backup-20261105.ora": { plain: blob("旧") }, "猫.backup-20261101.ora": { plain: blob("更旧") } } });
    await r.verbs.saveVersion(item("猫.ora"), "replace-last", sib, { now: NOW });
    eq(ops(r.log), "save:猫.backup-20261108.ora > trash:猫.backup-20261105.ora", "替换的是最新的那一版；更旧的不动");
    eq(r.statuses.pop()[0], t("gal.st.versionReplaced", { name: "猫.backup-20261108" }));
  });
  it("存到上一版、新的没存成 → 上一份一定还在（什么都没删）", async () => {
    const sib = [item("猫.ora"), item("猫.backup-20261105.ora")];
    const r = mk({ files: { "猫.backup-20261105.ora": { plain: blob("旧") } } });   // 原作拿不到字节
    eq(await r.verbs.saveVersion(item("猫.ora"), "replace-last", sib, { now: NOW }), null);
    eq(r.log.filter((l) => l[0] === "trash").length, 0);
    eq(r.statuses.pop()[1], true, "如实报没存成");
  });
  it("存到上一版、上一版加了星 → 新的照存，上一版留着，如实说", async () => {
    const sib = [item("猫.ora"), item("猫.backup-20261105.ora", { starred: true })];
    const r = mk({ files: { "猫.ora": { plain: blob("画") }, "猫.backup-20261105.ora": { plain: blob("旧"), starred: true } } });
    eq(await r.verbs.saveVersion(item("猫.ora"), "replace-last", sib, { now: NOW }), "猫.backup-20261108.ora");
    assert(r.files["猫.backup-20261105.ora"], "上一版还在");
    eq(r.statuses.pop()[0], t("gal.st.versionReplaceStarred", { name: "猫.backup-20261108" }));
  });
  it("存到上一版、还没有上一版 → 就是存一版", async () => {
    const r = mk({ files: { "猫.ora": { plain: blob("画") } } });
    await r.verbs.saveVersion(item("猫.ora"), "replace-last", [item("猫.ora")], { now: NOW });
    eq(ops(r.log), "save:猫.backup-20261108.ora");
  });
  it("正开着的那份：先让编辑器落盘再复制——只落盘（flush），绝不退出（0.9.0 调了 exit，在画布上点「存一版再改」把人踢回图库）", async () => {
    const r = mk({ files: { "猫.ora": { plain: blob("画") } }, active: "猫.ora" });
    await r.verbs.saveVersion(item("猫.ora"), "new", [item("猫.ora")], { now: NOW });
    eq(ops(r.log), "flush: > save:猫.backup-20261108.ora");
    assert(!r.log.some((l) => l[0] === "exit"), "没有退出");
    const r2 = mk({ files: { "猫.ora": { plain: blob("画") } }, active: "猫.ora", flush: false });   // 宿主没给 flush：不落、也不退出
    await r2.verbs.saveVersion(item("猫.ora"), "new", [item("猫.ora")], { now: NOW });
    eq(ops(r2.log), "save:猫.backup-20261108.ora");
  });
  it("给一版再存一版 = 还是那份原作的版本（不叠标记）", async () => {
    const sib = [item("猫.ora"), item("猫.backup-20261105.ora")];
    const r = mk({ files: { "猫.backup-20261105.ora": { plain: blob("旧") } } });
    eq(await r.verbs.saveVersion(item("猫.backup-20261105.ora"), "new", sib, { now: NOW }), "猫.backup-20261108.ora");
  });
  it("存一版再改：存成了才解锁；没存成不解", async () => {
    let r = mk({ files: { "猫.ora": { plain: blob("画") } } });
    eq(await r.verbs.saveVersionThenUnlock(item("猫.ora"), [item("猫.ora")], { now: NOW }), true);
    eq(ops(r.log), "save:猫.backup-20261108.ora > unlock:猫.ora");
    r = mk({ files: {} });
    eq(await r.verbs.saveVersionThenUnlock(item("猫.ora"), [item("猫.ora")], { now: NOW }), false);
    eq(r.log.filter((l) => l[0] === "unlock").length, 0, "没留成底 = 不解锁");
  });
});

describe("verbs · 加密件：复制 / 存一版原样搬密文，绝不落明文", () => {
  it("本机有容器 → 搬容器", async () => {
    const r = mk({ files: { "密.ora": { enc: blob("密文"), plain: blob("明文") } } });
    await r.verbs.saveVersion(item("密.ora"), "new", [item("密.ora")], { now: NOW });
    eq(r.log.find((l) => l[0] === "save")[4], "密文");
  });
  it("纯云端的加密件：open 把容器拉到本机之后搬容器，不用解出来的明文（0.8.x 的复制在这里会落一份明文副本）", async () => {
    const r = mk({ files: { "密.ora": { pullsContainer: blob("密文"), plain: blob("明文") } } });
    await r.verbs.copy(item("密.ora", { syncState: "cloud-only", cloudSealed: true }), ["密.ora"]);
    eq(r.log.find((l) => l[0] === "save")[4], "密文");
  });
  it("拿不到容器、而库说云端那份是加密的 → 拒绝，一个字节不写", async () => {
    const r = mk({ files: { "密.ora": { plain: blob("明文") } } });
    eq(await r.verbs.saveVersion(item("密.ora", { syncState: "cloud-only", cloudSealed: true }), "new", [item("密.ora")], { now: NOW }), null);
    await r.verbs.copy(item("密.ora", { syncState: "cloud-only", cloudSealed: true }), ["密.ora"]);
    eq(r.log.filter((l) => l[0] === "save").length, 0);
    eq(r.statuses.pop()[0], t("gal.st.sealedNoLocal"));
  });
});

describe("verbs · 锁 / 星 / 收起", () => {
  it("解锁 / 锁上：调库、说话；库没有这把锁（老版本）→ 如实说做不了，返回 false", async () => {
    let r = mk();
    eq(await r.verbs.unlockEdit(item("猫.ora")), true); await r.verbs.lockEdit(item("猫.ora"));
    eq(ops(r.log), "unlock:猫.ora > lock:猫.ora");
    eq(r.statuses[0][0], t("gal.st.editUnlocked", { name: "猫" })); eq(r.statuses[1][0], t("gal.st.editLocked", { name: "猫" }));
    r = mk({ lock: false });
    eq(await r.verbs.unlockEdit(item("猫.ora")), false); eq(r.statuses.pop()[1], true);
  });
  it("加星 / 撤星 / 收起 / 取消收起：调库、说话；库没开记号 → 如实说", async () => {
    let r = mk();
    await r.verbs.star(item("猫.ora")); await r.verbs.unstar(item("猫.ora")); await r.verbs.fold(item("猫.ora")); await r.verbs.unfold(item("猫.ora"));
    eq(ops(r.log), "star:猫.ora > unstar:猫.ora > fold:猫.ora > unfold:猫.ora");
    eq(r.statuses.map((s) => s[1]).join(), "false,false,false,false");
    r = mk({ marks: false });
    await r.verbs.star(item("猫.ora")); eq(r.statuses.pop()[1], true);
  });
  it("删除加了星的：不弹确认、不调库，直接说先撤星", async () => {
    const r = mk({ files: { "猫.ora": { plain: blob("画"), starred: true } } });
    await r.verbs.del(item("猫.ora", { starred: true }));
    eq(r.log.length, 0, "没弹确认、没碰库");
    eq(r.statuses.pop()[0], t("gal.st.starredNoDel", { name: "猫" }));
    assert(r.files["猫.ora"]);
  });
  it("列表还没带上星（别的设备刚加的）、库拦下来了 → 同一句话，不说「删除失败」", async () => {
    const r = mk({ files: { "猫.ora": { plain: blob("画"), starred: true } } });
    await r.verbs.del(item("猫.ora"));
    eq(r.statuses.pop()[0], t("gal.st.starredNoDel", { name: "猫" }));
    assert(r.files["猫.ora"]);
  });
  it("「处理…」里选了这份进回收站、库因为星没动 → 说清先撤星", async () => {
    const r = mk({ files: { "猫.ora": { plain: blob("画"), resolve: { status: "unresolved", reason: "starred" } } } });
    await r.verbs.resolve(item("猫.ora"));
    eq(r.statuses.pop()[0], t("gal.st.resolve.starred", { name: "猫" }));
  });
});

describe("verbs · 回收站不连坐（0.9.2，store 2.3.1；user「不应该牵连，不应该连坐」）", () => {
  const aside = { box: "trash", identifier: "猫.ora", stem: "猫", kind: "painting", localKey: "k", cloudRef: "r", side: "both", at: 0 };
  it("彻底删加了星的那一份：库拒了 → 说清先还原或撤星，不说「删除失败」；清空：留下的份数如实说", async () => {
    const statuses2 = [];   // 这一条要一个「彻底删会被库拒、清空会留下一份」的假库，单独造
    const v = createGalleryVerbs({ store: () => ({ identifiers: IDS, file: () => ({}), files: { purgeTrash: async () => { throw new StarredError(); }, emptyTrash: async () => ({ failed: [], kept: [{ name: "猫.ora", where: "cloud" }] }) } }),
      host: { signedIn: () => true, online: () => true, activeIdentifier: () => null, confirm: async () => true, input: async () => null, chooseFolder: async () => null, status: (msg, e) => statuses2.push([msg, !!e]), busy: async (_l, fn) => fn() }, doc: {} });
    await v.asidePurge(aside);
    eq(statuses2.pop()[0], t("gal.st.starredNoPurge", { name: "猫" }));
    await v.emptyAside("trash", "both");
    const last = statuses2.pop();
    eq(last[0], t("gal.st.emptyKeptStarred", { label: t("gal.scope.both"), n: 1 }), "清空：留下的份数如实说");
  });
});
