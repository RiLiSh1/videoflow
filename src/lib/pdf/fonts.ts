import { Font } from "@react-pdf/renderer";
import { existsSync } from "fs";
import { join } from "path";

let fontsRegistered = false;

export function registerFonts() {
  if (fontsRegistered) return;

  const localPath = join(process.cwd(), "public", "fonts", "NotoSansJP-Regular.ttf");

  // Vercel serverless では public/ がファイルシステムにないため URL で取得
  const src = existsSync(localPath)
    ? localPath
    : `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "localhost:3000"}/fonts/NotoSansJP-Regular.ttf`;

  Font.register({
    family: "NotoSansJP",
    src,
  });

  fontsRegistered = true;
}
