// 缩略图生成（gallery-native，从 WeebPaint ora.ts renderThumbnailAdaptive + algorithms/resample-bytes.ts 抽来；user 2026-09-10「缩略图本来就是 gallery native 的不是 app specific 的，也许需要再抽一下 weebpaint」）。
// created 2026-09-10 by Claude Fable 5.1。
//   · 输入 = straight RGBA 像素（解码边界归宿主：WeebPaint 是 GL 合成读回，WXHW 是 createImageBitmap 读出一次）；输出 = PNG 字节（ORA 约定：≤256×256）。
//   · 预算：整块 ≤ maxBytes（默认 70 KB = 尾窗 80 KB 减 central directory），阶梯 256 → 192 → 128；每档先无损再 256 色调色板
//     （WeebPaint 只有无损档，插画类内容无损 256² 常 100 KB+ 会掉到 128² 变糊 → 调色板档是本包加的，仍是 PNG 仍是 ORA 路径）。
//   · 永不放大（naturalEdge < 128 的像素画原尺寸进，屏幕侧用 image-rendering: pixelated 保锐）。
//   · PNG 编码器注入（宿主 vendor UPNG；本包零依赖）：encodePng(rgba, w, h, colors) → PNG 字节；colors=0 无损、>0 调色板量化。
//   · 面积平均重采样 = 缩小的理论正解（premult 累加、反预乘）；全 typed array，node 直测。
export interface RgbaImage { data: Uint8ClampedArray; w: number; h: number }
export type PngEncoder = (rgba: Uint8ClampedArray, w: number, h: number, colors: number) => Uint8Array;
export const THUMB_MAX_BYTES = 70 * 1024;
export const THUMB_LADDER: readonly number[] = [256, 192, 128];
export const THUMB_PALETTE_COLORS = 256;

/** 面积平均缩小（straight RGBA → straight RGBA；premult 累加、反预乘）。放大时退化为近似盒复制，别用。 */
export function areaResampleRgba(src: Uint8ClampedArray, sw: number, sh: number, tw: number, th: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(tw * th * 4);
  const xr = sw / tw, yr = sh / th;
  for (let dy = 0; dy < th; dy++) {
    const y0 = dy * yr, y1 = (dy + 1) * yr;
    const iy0 = Math.floor(y0), iy1 = Math.min(sh, Math.ceil(y1));
    for (let dx = 0; dx < tw; dx++) {
      const x0 = dx * xr, x1 = (dx + 1) * xr;
      const ix0 = Math.floor(x0), ix1 = Math.min(sw, Math.ceil(x1));
      let r = 0, g = 0, b = 0, a = 0, area = 0;
      for (let yy = iy0; yy < iy1; yy++) {
        const wy = Math.min(y1, yy + 1) - Math.max(y0, yy);
        if (wy <= 0) continue;
        let p = (yy * sw + ix0) * 4;
        for (let xx = ix0; xx < ix1; xx++, p += 4) {
          const wx = Math.min(x1, xx + 1) - Math.max(x0, xx);
          if (wx <= 0) continue;
          const wgt = wx * wy;
          const av = src[p + 3]!;
          r += src[p]! * av * wgt; g += src[p + 1]! * av * wgt; b += src[p + 2]! * av * wgt;
          a += av * wgt; area += wgt;
        }
      }
      const o = (dy * tw + dx) * 4;
      if (area <= 0 || a < 1e-4) continue;
      out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a); out[o + 2] = Math.round(b / a);
      out[o + 3] = Math.round(a / area);
    }
  }
  return out;
}

/** 等比缩到长边 ≤ maxEdge；永不放大。 */
export function fitWithin(w: number, h: number, maxEdge: number): { w: number; h: number } {
  const k = Math.min(1, maxEdge / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

/** 拍平白底（in place）：straight RGBA → 不透明。缩略图/JPEG 无 alpha 场景用。 */
export function flattenWhiteInPlace(rgba: Uint8ClampedArray): Uint8ClampedArray {
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3]!;
    if (a === 255) continue;
    const f = a / 255, inv = 255 * (1 - f);
    rgba[i] = rgba[i]! * f + inv; rgba[i + 1] = rgba[i + 1]! * f + inv; rgba[i + 2] = rgba[i + 2]! * f + inv; rgba[i + 3] = 255;
  }
  return rgba;
}

export interface MakeThumbOpts {
  encodePng: PngEncoder;
  maxBytes?: number;
  ladder?: readonly number[];
  paletteColors?: number;
  /** 保 alpha（WeebPaint ora 约定「保 alpha 不涂底」）；false = 拍平白底（书封面）。默认 true。 */
  keepAlpha?: boolean;
}
export interface ThumbResult { png: Uint8Array; w: number; h: number; colors: number; edge: number }

/** 自适应缩略图：阶梯逐档、每档先无损后调色板，第一个 ≤ maxBytes 的胜出；都超 → 最小档调色板。 */
export function makeThumbAdaptive(src: RgbaImage, opts: MakeThumbOpts): ThumbResult {
  const maxBytes = opts.maxBytes ?? THUMB_MAX_BYTES, ladder = opts.ladder ?? THUMB_LADDER, colors = opts.paletteColors ?? THUMB_PALETTE_COLORS;
  let last: ThumbResult | null = null;
  for (const edge of ladder) {
    const { w, h } = fitWithin(src.w, src.h, edge);
    const px = (w === src.w && h === src.h) ? new Uint8ClampedArray(src.data) : areaResampleRgba(src.data, src.w, src.h, w, h);
    if (opts.keepAlpha === false) flattenWhiteInPlace(px);
    for (const c of [0, colors]) {
      const png = opts.encodePng(px, w, h, c);
      last = { png, w, h, colors: c, edge };
      if (png.length <= maxBytes) return last;
    }
    if (w === src.w && h === src.h && edge !== ladder[ladder.length - 1]) continue;   // 源已比这档小：下一档还会再缩，继续
  }
  return last!;
}
