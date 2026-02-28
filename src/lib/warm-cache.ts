import { headers as getHeaders } from "next/headers";

/**
 * Warm the CDN/browser cache for a video stream.
 * Uses internal token auth so it works without user session.
 * Fire-and-forget: does not block the caller.
 */
export function warmVideoCache(googleDriveFileId: string) {
  (async () => {
    try {
      const reqHeaders = await getHeaders();
      const host = reqHeaders.get("host") || "localhost:3000";
      const proto = reqHeaders.get("x-forwarded-proto") || "https";
      const warmToken = process.env.JWT_SECRET || "";
      const warmUrl = `${proto}://${host}/api/drive/stream/${googleDriveFileId}`;

      // Fire and forget — warm CDN cache
      fetch(warmUrl, {
        headers: { "X-Warm-Token": warmToken },
      }).catch(() => {});
    } catch {
      // ignore
    }
  })();
}
