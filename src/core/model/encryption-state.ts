// 一份文档「现在是不是加密的」——图库里唯一的判定处；加上「已知加密 → 缓存里加密之前的明文副产品作废」。created 2026-11-04 by Claude Opus 5.5
// 起因：CatsUp 2026-11-03 工单 C 报告「C2」「C3 追加」两节（家族规则书 §1 第 5 条：加密了的，它和它的一切副产品，在任何地方只存密文）跨设备失守：
//   ① 卡片的锁 / 加密菜单只看「本地字节是不是容器」，而且**按名字记一次就再也不看**——别的设备加密后，这台快进拿到容器了也还显示「没加密」、给「加密…」；
//   ② 知道这份已经加密之后，缩略图缓存里加密之前那张明文封面还留着，拉不到新图时格子还退回去显示它。
// 判定 = 取或（任何一路说加密就算加密），每一路都是 store / 加密端口给的事实，图库自己不看字节内容：
//   local = 本地字节是加密容器（宿主 encryption.isEncrypted → store file.isEncrypted；纯本地读头，无网络）；
//   peek  = store 的 getPeek 回的是密文 peek（宿主 encryption.isEncryptedPeekBlob 认的是 store 打的 ENC_PEEK_MIME）——现拉的、缓存里的都算；
//   搁置区（回收站 / 备份箱）的卡片另有 store 的 TrashItem.encrypted（云端名带容器后缀），模板直接用，不进这张表。
// ⚠ 还缺的一路：**活文件的云端名带不带容器后缀**。store 知道（identifiers.fromCloud 的 sealed），但列举出来的 Item 不带这个字段（截至 store 2.2.5），
//   图库拿不到。所以「纯云端、这台从没开过、种类又没有密文 peek」的那份（CatsUp：getHead 对加密件回 null）第一次打开之前仍然显示不加密。
//   要 store 在 Item 上带出这个事实才能补；那时它就是这里的第三路（ai-docs/20261104-0.8.11-encrypted-state-display.md §3）。
// 版本戳：每条结论绑「syncState + 修改时间 + 大小」。版本变了 = 字节可能换了（别的设备加密 / 解除 / 快进），旧结论作废、重新探：
//   - peek 那一路随版本作废（格子会按新版本重拉，重拉到的说了算）；
//   - local 那一路在重探完成之前沿用上一版的结论（只差一次本地读头的工夫；不沿用的话锁会闪一下、格子会多拉一次）。

/** 一份文档的加密事实（图库内部用；不出包门牌）。两路各记各的版本：lv = 本地那一路是在哪一版探的；pv = store 的 peek 在哪一版说过「是容器」。 */
export interface EncFacts { lv?: string; local?: boolean; pv?: string }

/** 版本戳：syncState + 修改时间 + 大小。任何一个变了，之前的加密结论就不再当真。 */
export const encVersionOf = (it: { syncState: string; lastModified?: number; size?: number }): string =>
  `${it.syncState}|${it.lastModified ?? ""}|${it.size ?? ""}`;

export interface EncryptionState {
  /** 这一版的本地那一路还没有结论（没探过 / 版本变了）→ 该探。 */
  needsLocalProbe(identifier: string, version: string): boolean;
  /** 记本地那一路的结论（本地没有字节的，记 false：本地这一路不说加密）。 */
  noteLocal(identifier: string, version: string, encrypted: boolean): void;
  /** store 的 peek 说这一版是加密容器。 */
  notePeek(identifier: string, version: string): void;
  /** 加密态 = 本地字节说加密 ∨ store 的事实说加密。锁图标、「不显示明文封面」、不取事实都看它。 */
  isEncrypted(identifier: string, version: string): boolean;
  /** 只看本地字节。「解除加密…」只对本地确实是容器的给（本地还是明文、云端已加密的那一刻，解除会被 store 回「这不是加密作品」）。 */
  isLocalEncrypted(identifier: string, version: string): boolean;
  /** 忘掉这一份（宿主 / 动词说加密态变了）。 */
  forget(identifier: string): void;
}

/** rec = 存结论的记录；屏幕层传 Vue 的 reactive({})，让卡片跟着结论重画。测试不传。 */
export function createEncryptionState(rec: Record<string, EncFacts> = {}): EncryptionState {
  const entry = (id: string): EncFacts => { if (!rec[id]) rec[id] = {}; return rec[id]; };
  // 本地那一路：版本变了、还没重探 → 沿用上一版的结论（见头注释）。peek 那一路只认同一版。
  const localOf = (id: string): boolean => rec[id]?.local === true;
  return {
    needsLocalProbe: (id, v) => rec[id]?.lv !== v,
    noteLocal: (id, v, encrypted) => { const e = entry(id); e.lv = v; e.local = encrypted; },
    notePeek: (id, v) => { entry(id).pv = v; },
    isEncrypted: (id, v) => localOf(id) || rec[id]?.pv === v,
    isLocalEncrypted: (id) => localOf(id),
    forget: (id) => { delete rec[id]; },
  };
}

/** 卡片 ⋯ 菜单里加密那两项给不给。「加密…」= 有本地字节 ∧ 不是已知加密；「解除加密…」= 本地字节确实是容器。
 *  两边对不上（云端已加密、本地还是旧明文、还没快进）→ 两项都不给：这时加密会推出一份和云端分叉的容器，解除会被 store 回「这不是加密作品」。 */
export function encryptionMenu(o: { hasEncryption: boolean; hasLocal: boolean; encrypted: boolean; localEncrypted: boolean }): { encrypt: boolean; decrypt: boolean } {
  return {
    encrypt: o.hasEncryption && o.hasLocal && !o.encrypted,
    decrypt: o.hasEncryption && o.hasLocal && o.localEncrypted,
  };
}

/** 缩略图格子拿到一个 blob 之后怎么办：
 *  密文 peek → "enc-peek"（走解密；同时就是「这份是加密的」的事实）；
 *  明文图 ∧ 已知加密 → "refuse"（不显示——不管它是现拉的、缓存命中的还是拉不到时退回来的旧图）；
 *  明文图 ∧ 不知道加密 → "show"。
 *  没有加密端口（认不出密文 peek）而又已知加密 → 一律 "refuse"。 */
export function admitThumbBlob(blob: Blob, o: { sealed: boolean; isEncryptedPeekBlob?: (b: Blob) => boolean }): "enc-peek" | "show" | "refuse" {
  if (o.isEncryptedPeekBlob?.(blob)) return "enc-peek";
  return o.sealed ? "refuse" : "show";
}

/** 已知加密的这一份：派生缓存里加密之前留下的明文副产品删掉——明文封面（密文 peek 留着，它本来就是密文）和卡片事实（加密件本来就不取事实，留着的都是明文时代的）。
 *  删 = 缓存自己的 invalidate（删条目 + 广播，格子按新状态重来）。返回删了哪几样。缓存读不到 / 删失败 → 抛给调用方记日志。 */
export interface PlainByproductCaches {
  thumbs?: { read(identifier: string): Promise<{ blob: Blob | null } | null>; invalidate(identifier: string): Promise<void> };
  facts?: { read(identifier: string): Promise<{ value: unknown } | null>; invalidate(identifier: string): Promise<void> };
  isEncryptedPeekBlob(b: Blob): boolean;
}
export async function dropPlainByproducts(identifier: string, c: PlainByproductCaches): Promise<{ thumb: boolean; facts: boolean }> {
  let thumb = false, facts = false;
  if (c.thumbs) {
    const e = await c.thumbs.read(identifier);
    if (e?.blob && !c.isEncryptedPeekBlob(e.blob)) { await c.thumbs.invalidate(identifier); thumb = true; }
  }
  if (c.facts) {
    const e = await c.facts.read(identifier);
    if (e && e.value != null) { await c.facts.invalidate(identifier); facts = true; }
  }
  return { thumb, facts };
}
