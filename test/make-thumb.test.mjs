// make-thumb：面积重采样正解 / 永不放大 / 阶梯 + 调色板档 / 白底拍平。created 2026-09-10 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
const eqj = (a, b) => eq(JSON.stringify(a), JSON.stringify(b));
import { areaResampleRgba, fitWithin, makeThumbAdaptive, flattenWhiteInPlace, THUMB_MAX_BYTES } from "../src/core/thumbs/make-thumb.ts";

const solid = (w, h, rgba) => { const d = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) d.set(rgba, i * 4); return { data: d, w, h }; };
/** 假编码器：字节数 = 像素数 × 每像素字节（无损 4、调色板 1）+ 头 100，记录调用。 */
const fakeEncoder = (log) => (rgba, w, h, colors) => { log.push({ w, h, colors }); return new Uint8Array(100 + w * h * (colors ? 1 : 4)); };

describe("make-thumb · 重采样与阶梯", () => {
  it("4×4 → 2×2 盒均值：左上 2×2 黑 + 其余白 → 左上像素纯黑、其余纯白", () => {
    const src = new Uint8ClampedArray(4 * 4 * 4).fill(255);
    for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const p = (y * 4 + x) * 4; src[p] = 0; src[p + 1] = 0; src[p + 2] = 0; }
    const out = areaResampleRgba(src, 4, 4, 2, 2);
    eqj([out[0], out[1], out[2], out[3]], [0, 0, 0, 255]); eqj([out[4], out[5], out[6], out[7]], [255, 255, 255, 255]);
  });
  it("半透明 premult 累加：全透明像素不拖颜色", () => {
    const src = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 0]);   // 红不透明 + 蓝全透明 → 1×1
    const out = areaResampleRgba(src, 2, 1, 1, 1);
    eqj([out[0], out[1], out[2]], [255, 0, 0]); eq(out[3], 128);
  });
  it("fitWithin 永不放大；长边对齐", () => { eqj(fitWithin(100, 50, 256), { w: 100, h: 50 }); eqj(fitWithin(1000, 500, 256), { w: 256, h: 128 }); eqj(fitWithin(500, 1000, 256), { w: 128, h: 256 }); });
  it("阶梯：256 无损超预算 → 256 调色板达标即胜出（不掉到 192）", () => {
    const log = []; const r = makeThumbAdaptive(solid(1024, 1024, [10, 20, 30, 255]), { encodePng: fakeEncoder(log), maxBytes: THUMB_MAX_BYTES });
    eq(r.edge, 256); eq(r.colors, 256); eq(r.w, 256); eq(log.length, 2);
  });
  it("阶梯：都超预算 → 最小档调色板兜底", () => {
    const log = []; const r = makeThumbAdaptive(solid(1024, 1024, [0, 0, 0, 255]), { encodePng: fakeEncoder(log), maxBytes: 10 });
    eq(r.edge, 128); eq(r.colors, 256); eq(log.length, 6);
  });
  it("小图（像素画 64×64）不放大：各档尺寸都是 64", () => {
    const log = []; const r = makeThumbAdaptive(solid(64, 64, [0, 0, 0, 255]), { encodePng: fakeEncoder(log) });
    eq(r.w, 64); eq(r.h, 64); assert(log.every((l) => l.w === 64));
  });
  it("keepAlpha:false 拍平白底；flattenWhiteInPlace 半透明按白底合成", () => {
    const px = new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 128]); flattenWhiteInPlace(px);
    eqj([px[0], px[3]], [255, 255]); eq(px[4], Math.round(255 * (1 - 128 / 255)));
    let seen = null; makeThumbAdaptive({ data: new Uint8ClampedArray([0, 0, 0, 0]), w: 1, h: 1 }, { encodePng: (rgba) => { seen = [...rgba]; return new Uint8Array(1); }, keepAlpha: false });
    eqj(seen, [255, 255, 255, 255]);
  });
});
