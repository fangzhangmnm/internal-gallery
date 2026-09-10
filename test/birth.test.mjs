import { test, eq } from "./runner.mjs";
import { GALLERY_PACKAGE_BIRTH } from "../src/index.ts";
test("[birth] 包存在（提案过目前只有出生证）", () => { eq(GALLERY_PACKAGE_BIRTH, "2026-09-09"); });
