// png-text：iTXt 写 / tEXt+iTXt 读 / 同关键字替换与删除 / CRC 有效 / 非 PNG 原样。created 2026-09-10 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { readPngText, withPngText, isPng, crc32, PNG_BLURB_KEYWORD } from "../src/core/thumbs/png-text.ts";

function chunk(type, data) {
  const c = new Uint8Array(12 + data.length); const dv = new DataView(c.buffer);
  dv.setUint32(0, data.length); for (let i = 0; i < 4; i++) c[4 + i] = type.charCodeAt(i); c.set(data, 8);
  dv.setUint32(8 + data.length, crc32(c, 4, 8 + data.length)); return c;
}
function minimalPng(extra = []) {
  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = new Uint8Array(13); const dv = new DataView(ihdr.buffer); dv.setUint32(0, 1); dv.setUint32(4, 1); ihdr[8] = 8; ihdr[9] = 6;
  const parts = [sig, chunk("IHDR", ihdr), ...extra, chunk("IDAT", new Uint8Array([0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01])), chunk("IEND", new Uint8Array(0))];
  let n = 0; for (const p of parts) n += p.length; const out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out;
}
const latin = (s) => new Uint8Array([...s].map((ch) => ch.charCodeAt(0)));

describe("png-text · 腰封文本块", () => {
  it("写 Description（中文 UTF-8）→ 读回原文；IEND 仍在末尾；chunk CRC 全部有效", () => {
    const png = withPngText(minimalPng(), PNG_BLURB_KEYWORD, "山田妖精老师背书：看到角色就欠她一个故事。");
    eq(readPngText(png)[PNG_BLURB_KEYWORD], "山田妖精老师背书：看到角色就欠她一个故事。");
    assert(isPng(png));
    // 末尾 12 字节 = IEND chunk
    eq(String.fromCharCode(...png.subarray(png.length - 8, png.length - 4)), "IEND");
    // 逐 chunk 验 CRC
    let p = 8; const dv = new DataView(png.buffer);
    while (p < png.length) { const len = dv.getUint32(p); const crc = dv.getUint32(p + 8 + len); eq(crc, crc32(png, p + 4, p + 8 + len)); p += 12 + len; }
  });
  it("读 tEXt（Latin-1）与 iTXt 混合；压缩 iTXt 跳过", () => {
    const text = chunk("tEXt", new Uint8Array([...latin("Author"), 0, ...latin("me")]));
    const itxtZ = chunk("iTXt", new Uint8Array([...latin("Comment"), 0, 1, 0, 0, 0, 1, 2, 3]));   // compFlag=1 → 跳过
    const png = withPngText(minimalPng([text, itxtZ]), "Description", "hi");
    const r = readPngText(png);
    eq(r.Author, "me"); eq(r.Description, "hi"); eq(r.Comment, undefined);
  });
  it("同关键字：再写 = 替换（旧块删掉，只剩一块）；写 null = 删除", () => {
    let png = withPngText(minimalPng([chunk("tEXt", new Uint8Array([...latin("Description"), 0, ...latin("old")]))]), "Description", "new");
    eq(readPngText(png).Description, "new");
    let count = 0; let p = 8; const dv = new DataView(png.buffer);
    while (p < png.length) { const len = dv.getUint32(p); const t = String.fromCharCode(...png.subarray(p + 4, p + 8)); if (t === "tEXt" || t === "iTXt") count++; p += 12 + len; }
    eq(count, 1);
    png = withPngText(png, "Description", null);
    eq(readPngText(png).Description, undefined);
  });
  it("非 PNG → 原样返回；非法关键字 → 抛", () => {
    const junk = new Uint8Array([1, 2, 3]);
    eq(withPngText(junk, "Description", "x"), junk);
    eq(Object.keys(readPngText(junk)).length, 0);
    let threw = false; try { withPngText(minimalPng(), "中文", "x"); } catch { threw = true; } assert(threw);
  });
});
