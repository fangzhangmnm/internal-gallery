// 加密件的封面：解密、显示、锁上时撤掉——格子里这一小段状态机（零 DOM，可测）。created 2026-11-08 by Claude Fable 5.1
// 起因（周账 F-228，user 2026-11-08）：「我点了那个 Lock Encrypted Works Forgot Password 之后，我还是能看见之前加密的东西，可能得 App 退回去重新新刷新」。
// 0.8.11 及以前这段住在 ThumbCell 里，锁上那一刻有三个洞：
//   ① 本地加密件：重新试解 → 解不开 → 只把「锁」记上，已经显示着的那张解密封面没撤；模板先看有没有图、再看锁 → 图还在；
//   ② 纯云端的加密件（手里只有密文 peek）：锁态变了根本不重新检查；
//   ③ 锁上之前开始、锁上之后才解完的那一次，结果照样显示。
// 现在的规矩（瑞士奶酪的这一层，不指望宿主的解密那时一定失败）：
//   - 锁上（密码忘了）那一刻，**同步**撤掉一切解密得来的封面，有密文来源的格子记上锁；在飞的解密作废；
//   - **锁着的时候不显示任何解密得来的封面**——哪怕宿主的 decrypt 回了图；
//   - 解锁 → 有密文来源的、或者正显示着锁的，重新试解。
// 明文封面（没加密的作品）不归这里管，只在「转进解密这条路之前先撤」那一步碰它（0.8.11 的规矩，原样搬来）。

/** 格子上现在显示的图是哪来的。 */
export type CoverShown = "none" | "plain" | "decrypted";

/** 格子借给状态机的手脚。 */
export interface SealedCoverPort {
  /** 密码现在在不在内存里（宿主 encryption.isUnlocked）。 */
  isUnlocked(): boolean;
  /** 这一格有没有密文来源（本地容器 / 云端的密文 peek）。 */
  hasSource(): boolean;
  /** 解这一格的封面：解得开 → PNG；解不开 / 没有封面 → null。 */
  decrypt(): Promise<Blob | null>;
  /** 格子上现在显示着什么。 */
  shown(): CoverShown;
  /** 格子现在是不是显示着锁。 */
  locked(): boolean;
  /** 显示一张解密得来的图（此后 shown() = "decrypted"）。 */
  show(png: Blob): void;
  /** 撤掉显示着的图（此后 shown() = "none"）。 */
  clear(): void;
  setLocked(v: boolean): void;
  /** 解密抛了（不是「解不开」，是真的出错）：格子按解不开处理，错误从这里报出去，不吞。 */
  onError?(err: unknown): void;
}

export interface SealedCover {
  /** 试着解这一格的封面并显示。 */
  tryDecrypt(): Promise<void>;
  /** 宿主说锁态变了。锁上那一支是同步的：返回时解密得来的图已经撤了。 */
  onLockChange(unlocked: boolean): void;
}

export function createSealedCover(p: SealedCoverPort): SealedCover {
  let seq = 0;   // 每次试解 / 每次锁上 +1：晚到的旧结果认不上号就作废
  async function tryDecrypt(): Promise<void> {
    const my = ++seq;
    if (p.shown() === "plain") p.clear();   // 转进解密这条路之前，明文时代显示着的那张先撤（解不开时有图会盖过锁）
    let png: Blob | null = null;
    try { png = await p.decrypt(); }
    catch (err) { png = null; if (my === seq) p.onError?.(err); }
    if (my !== seq) return;
    if (!p.isUnlocked()) {                   // 锁着：不显示任何解密得来的图
      if (p.shown() === "decrypted") p.clear();
      p.setLocked(true);
      return;
    }
    if (png && png.size > 0) { p.setLocked(false); p.show(png); return; }
    if (p.shown() === "decrypted") p.clear();   // 这一版解不出封面了：上一版解出来的那张不留
    p.setLocked(false);                          // 解锁了但这份没有封面 → 占位图标，不是锁（锁只表示「解不开」）
  }
  function onLockChange(unlocked: boolean): void {
    if (unlocked) { if (p.hasSource() || p.locked()) void tryDecrypt(); return; }
    seq++;                                   // 在飞的解密作废
    if (p.shown() === "decrypted") p.clear();
    if (p.hasSource()) p.setLocked(true);
  }
  return { tryDecrypt, onLockChange };
}
