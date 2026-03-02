/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
  async headers() {
    return [
      {
        // Vercel Blob CDN videos — aggressive cache
        source: "/api/drive/stream/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=2592000" },
        ],
      },
      {
        // Static assets — long cache
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
