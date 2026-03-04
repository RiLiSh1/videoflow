import { Font } from "@react-pdf/renderer";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

let fontsRegistered = false;

export function registerFonts() {
  if (fontsRegistered) return;

  // Try local file first (works in dev and some build setups)
  const localPath = join(process.cwd(), "public", "fonts", "NotoSansJP-Regular.ttf");

  if (existsSync(localPath)) {
    // Register from local file path
    Font.register({
      family: "NotoSansJP",
      src: localPath,
    });
  } else {
    // Vercel serverless: public/ not available on filesystem.
    // Use the production URL or a CDN URL to fetch the font.
    const host =
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      process.env.VERCEL_URL ||
      `localhost:${process.env.PORT || "3000"}`;
    const protocol = host.startsWith("localhost") ? "http" : "https";
    const fontUrl = `${protocol}://${host}/fonts/NotoSansJP-Regular.ttf`;

    Font.register({
      family: "NotoSansJP",
      src: fontUrl,
    });
  }

  fontsRegistered = true;
}
