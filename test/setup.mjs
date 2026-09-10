// 测试前置：WeebPaint 的这些用例按 node=en 写（zh 运行时同构）；包默认 zh → 这里切 en。
import { configureText } from "../src/core/text.ts";
configureText({ lang: "en" });
