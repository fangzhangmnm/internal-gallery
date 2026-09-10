// PNG 文本块读写（gallery-native：缩略图自带一小段文字 = 书的腰封 / 画的 caption；user 2026-09-10「thumbnail.png 的标准 tEXt 文本块。free lunch！做！这个是 gallery 库的公共行为」）。
// created 2026-09-10 by Claude Fable 5.1。
//   · 写：iTXt（UTF-8，PNG 规范 11.3.4.4；tEXt 只能 Latin-1，中文进不去）插在 IEND 前；同关键字旧块（tEXt / zTXt / iTXt）先删。
//   · 读：tEXt + 未压缩 iTXt；zTXt / 压缩 iTXt 跳过（缩略图是我们自己写的，永远不压缩）。
//   · 关键字用 PNG 规范登记的标准词 `Description`（exiftool / 任何看图软件直接显示）；酒馆卡用 `chara`，互不相干。
//   · 零依赖、零 DOM；CRC32 自带。
export const PNG_BLURB_KEYWORD = "Description";
const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function isPng(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false;
  for (let i = 0; i < 8; i++) if (bytes[i] !== SIG[i]) return false;
  return true;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
  return t;
})();
export function crc32(bytes: Uint8Array, from = 0, to = bytes.length): number {
  let c = 0xffffffff;
  for (let i = from; i < to; i++) c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

interface Chunk { type: string; start: number; end: number; dataStart: number; dataEnd: number }
/** 遍历 chunk 表（容错：越界即停）。 */
function chunks(png: Uint8Array): Chunk[] {
  const out: Chunk[] = [];
  if (!isPng(png)) return out;
  const dv = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let p = 8;
  while (p + 12 <= png.length) {
    const len = dv.getUint32(p);
    const type = String.fromCharCode(png[p + 4]!, png[p + 5]!, png[p + 6]!, png[p + 7]!);
    const end = p + 12 + len;
    if (end > png.length) break;
    out.push({ type, start: p, end, dataStart: p + 8, dataEnd: p + 8 + len });
    if (type === "IEND") break;
    p = end;
  }
  return out;
}

const latin1 = (b: Uint8Array): string => { let s = ""; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]!); return s; };
const nul = (b: Uint8Array, from: number): number => { for (let i = from; i < b.length; i++) if (b[i] === 0) return i; return -1; };

/** 读全部文本块 → 关键字到文本的映射。同关键字多块取最后一个。 */
export function readPngText(png: Uint8Array): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of chunks(png)) {
    if (c.type !== "tEXt" && c.type !== "iTXt") continue;
    const d = png.subarray(c.dataStart, c.dataEnd);
    const k = nul(d, 0); if (k <= 0) continue;
    const keyword = latin1(d.subarray(0, k));
    if (c.type === "tEXt") { out[keyword] = latin1(d.subarray(k + 1)); continue; }
    // iTXt: keyword\0 compFlag compMethod langTag\0 translatedKeyword\0 text
    if (d.length < k + 3) continue;
    const compFlag = d[k + 1];
    const l = nul(d, k + 3); if (l < 0) continue;
    const tk = nul(d, l + 1); if (tk < 0) continue;
    if (compFlag !== 0) continue;   // 压缩 iTXt：不是我们写的，跳过
    out[keyword] = new TextDecoder("utf-8").decode(d.subarray(tk + 1));
  }
  return out;
}

function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const c = new Uint8Array(12 + data.length);
  const dv = new DataView(c.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) c[4 + i] = type.charCodeAt(i);
  c.set(data, 8);
  dv.setUint32(8 + data.length, crc32(c, 4, 8 + data.length));
  return c;
}

/** 写 / 删一个关键字的文本：先删同关键字的旧块（tEXt / zTXt / iTXt），text 非空则在 IEND 前插一块 iTXt（UTF-8）。
 *  非 PNG / 无 IEND → 原样返回（不假装成功）。关键字按 PNG 规范 1–79 字节 Latin-1。 */
export function withPngText(png: Uint8Array, keyword: string, text: string | null): Uint8Array {
  const all = chunks(png);
  const iend = all.find((c) => c.type === "IEND");
  if (!iend) return png;
  if (!/^[\x20-\x7e\xa1-\xff]{1,79}$/.test(keyword)) throw new Error("png text keyword must be 1-79 Latin-1 printable bytes");
  const drop = new Set<number>();
  for (const c of all) {
    if (c.type !== "tEXt" && c.type !== "zTXt" && c.type !== "iTXt") continue;
    const d = png.subarray(c.dataStart, c.dataEnd);
    const k = nul(d, 0);
    if (k > 0 && latin1(d.subarray(0, k)) === keyword) drop.add(c.start);
  }
  const parts: Uint8Array[] = [png.subarray(0, 8)];
  for (const c of all) {
    if (drop.has(c.start)) continue;
    if (c.type === "IEND" && text) {
      const kw = new Uint8Array(keyword.length); for (let i = 0; i < keyword.length; i++) kw[i] = keyword.charCodeAt(i);
      const body = new TextEncoder().encode(text);
      const data = new Uint8Array(kw.length + 1 + 2 + 1 + 1 + body.length);   // keyword \0 flag method lang\0 tkey\0 text
      data.set(kw, 0); data[kw.length] = 0; data[kw.length + 1] = 0; data[kw.length + 2] = 0; data[kw.length + 3] = 0; data[kw.length + 4] = 0;
      data.set(body, kw.length + 5);
      parts.push(makeChunk("iTXt", data));
    }
    parts.push(png.subarray(c.start, c.end));
  }
  let n = 0; for (const p of parts) n += p.length;
  const out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
