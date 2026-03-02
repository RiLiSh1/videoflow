import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LM-動画システム",
  description: "LM-動画システム - 動画制作の納品・レビュープロセスを一元管理",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://www.googleapis.com" />
        <link rel="dns-prefetch" href="https://www.googleapis.com" />
        {/* Vercel Blob CDN — preconnect for instant video delivery */}
        <link rel="preconnect" href="https://x0yko9ls9ueq2ftr.public.blob.vercel-storage.com" />
        <link rel="dns-prefetch" href="https://x0yko9ls9ueq2ftr.public.blob.vercel-storage.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
