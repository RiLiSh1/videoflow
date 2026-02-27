import { Font } from "@react-pdf/renderer";

let fontsRegistered = false;

export function registerFonts() {
  if (fontsRegistered) return;

  Font.register({
    family: "NotoSansJP",
    src: process.cwd() + "/public/fonts/NotoSansJP-Regular.ttf",
  });

  fontsRegistered = true;
}
