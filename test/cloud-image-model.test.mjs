// 云盘图片 picker 纯模型测试（spec ai-docs/20260820-cloud-image-picker-spec.md）。
// 列举订阅 / IDB 缓存 / 组件 DOM node 测不到 → 进真机批；扩展名路由、token、缩图数学、
// 白底平铺、jpeg 编码接缝是纯的，钉在这里。
import { describe, it, assert, eq } from "./runner.mjs";
import {
  isImagePath, imageBasename, mimeForImageName,
  imageThumbToken, thumbTargetSize, flattenOntoWhite, nextFreeExportName, imageTwinIdentifier,
} from "../src/core/model/cloud-image-model.ts";

describe("cloud-image · 图片白名单（0.6.0：「哪些是文档」归 store.identifiers，本模块只剩图片）", () => {
  it("图片白名单 = 浏览器可解码集", () => {
    for (const p of ["a.png", "b.jpg", "c.JPEG", "d.gif", "e.webp", "f.bmp", "g.avif", "夹/图.png"]) {
      assert(isImagePath(p), `${p} 应是图片`);
    }
    for (const p of ["a.ora", "a.ora.zip", "a.md", "a.psd", "a.svg", "a.tga", "png"]) {
      assert(!isImagePath(p), `${p} 不该进图片白名单（svg/tga 显式后置，spec §3）`);
    }
  });
  it("basename / MIME", () => {
    eq(imageBasename("素材/mock/ui-a.png"), "ui-a.png");
    eq(imageBasename("root.png"), "root.png");
    eq(mimeForImageName("x.PNG"), "image/png");
    eq(mimeForImageName("x.jpeg"), "image/jpeg");
    eq(mimeForImageName("x.unknown"), "application/octet-stream", "未知扩展给 octet-stream（浏览器嗅字节，无害）");
  });
});

describe("cloud-image · 缩略图 token/尺寸（错了会缓存不失效或糊图）", () => {
  it("token：lastModified 优先，退 size；变了必换", () => {
    eq(imageThumbToken({ lastModified: 111, size: 5 }), imageThumbToken({ lastModified: 111, size: 9 }), "有 lastModified 时 size 不参与");
    assert(imageThumbToken({ lastModified: 111 }) !== imageThumbToken({ lastModified: 222 }), "改文件 → token 变 → 重拉");
    assert(imageThumbToken({ size: 5 }) !== imageThumbToken({ size: 6 }), "无 lastModified 退 size");
    assert(imageThumbToken({ lastModified: 5 }) !== imageThumbToken({ size: 5 }), "两种来源不串号");
  });
  it("目标尺寸：长边压到 max、保比例、绝不放大", () => {
    eq(JSON.stringify(thumbTargetSize(1024, 512, 128)), JSON.stringify({ w: 128, h: 64 }));
    eq(JSON.stringify(thumbTargetSize(512, 1024, 128)), JSON.stringify({ w: 64, h: 128 }));
    eq(JSON.stringify(thumbTargetSize(100, 50, 128)), JSON.stringify({ w: 100, h: 50 }), "小图不放大");
    eq(JSON.stringify(thumbTargetSize(10000, 1, 128)), JSON.stringify({ w: 128, h: 1 }), "极端条状不塌成 0");
  });
});

describe("cloud-image · 孪生身份（v0.9.34 图库点图片=开同夹同主干的文档；0.6.0 收表里第一种文档的后缀）", () => {
  it("夹前缀 + 去图片扩展名 + 文档后缀", () => {
    eq(imageTwinIdentifier("素材/mock", "ui-a.png", ".ora"), "素材/mock/ui-a.ora");
    eq(imageTwinIdentifier("", "foo.jpeg", ".ora"), "foo.ora");
    eq(imageTwinIdentifier("A", "多点.名.webp", ".ora"), "A/多点.名.ora", "只去最后一个扩展名");
    eq(imageTwinIdentifier("A", "无扩展名", ".ora"), "A/无扩展名.ora", "无扩展名整名当主干");
  });
});

describe("cloud-image · 导出到云盘的撞名后缀（v0.9.30）", () => {
  it("不占用 → 原名；占用 → 空格数字后缀递增", async () => {
    const occupied = new Set(["画/a-20260820-1200.png", "画/a-20260820-1200 1.png"]);
    const probe = (n) => Promise.resolve(occupied.has(n));
    eq(await nextFreeExportName("画/b-20260820-1200", "png", probe), "画/b-20260820-1200.png");
    eq(await nextFreeExportName("画/a-20260820-1200", "png", probe), "画/a-20260820-1200 2.png");
  });
  it("20 连撞 → 时间戳兜底（保证必返回）", async () => {
    const name = await nextFreeExportName("x", "psd", () => Promise.resolve(true), () => 777);
    eq(name, "x-777.psd");
  });
});

// （「白底平铺 + jpeg 编码」用例留在 WeebPaint：encodeJpegFromBytes 是宿主 codec，不进包。flattenOntoWhite 在本包但无独立用例。）
