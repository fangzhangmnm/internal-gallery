// zip 容器内 entry 缩略图取字节（WET 自 WeebPaint src/gallery/cloud-thumbs.ts）：zip 解析在 store（getPeek 尾片 + 按名取 entry），这里只剩 app 域常量。
export const SUFFIX_BYTES = 81920;                       // 先拉尾窗口 80KB：thumb ≤70KB + CD/EOCD ~10KB
export const ORA_THUMB_PATH = "Thumbnails/thumbnail.png";  // ORA 规范位置（WeebPaint）；别的容器自定
export interface PeekableFile { getPeek(o: { bytesLength: number; zipEntry: string; source: "local" | "cloud" }): Promise<Blob | null>; }
/** 明文容器 → entry 原始字节 Blob；加密容器 → 密文 peek Blob(ENC_PEEK_MIME)。取不到 → 抛（caller 显占位）。source="cloud" 绝不静默落回本地。 */
export async function fetchZipEntryThumb(file: PeekableFile, source: "local" | "cloud", opts: { zipEntry?: string; bytesLength?: number } = {}): Promise<Blob> {
  const blob = await file.getPeek({ bytesLength: opts.bytesLength ?? SUFFIX_BYTES, zipEntry: opts.zipEntry ?? ORA_THUMB_PATH, source });
  if (!blob) throw new Error("getPeek returned null (cloud unreachable / no such file / no such entry / no local copy)");
  return blob;
}
