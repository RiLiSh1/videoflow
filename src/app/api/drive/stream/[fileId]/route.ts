import { getSession } from "@/lib/auth/session";
import { getAccessTokenLite } from "@/lib/google-auth-lite";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;

  // Auth: user session OR internal warming token (for server-side cache warming)
  const warmToken = request.headers.get("X-Warm-Token");
  const jwtSecret = process.env.JWT_SECRET;
  if (warmToken && jwtSecret && warmToken === jwtSecret) {
    // Server-side warming — skip session check
  } else {
    const user = await getSession();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  try {
    const accessToken = await getAccessTokenLite();
    const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };
    const range = request.headers.get("Range");
    if (range) headers["Range"] = range;

    const res = await fetch(url, { headers });

    if (!res.ok && res.status !== 206) {
      return new Response("File not found", { status: 404 });
    }

    const responseHeaders: Record<string, string> = {
      "Content-Type": res.headers.get("Content-Type") || "video/mp4",
      "Accept-Ranges": "bytes",
      // max-age: browser cache (30 days), s-maxage: CDN cache (30 days)
      "Cache-Control": "public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=2592000",
    };
    const contentRange = res.headers.get("Content-Range");
    if (contentRange) responseHeaders["Content-Range"] = contentRange;
    const contentLength = res.headers.get("Content-Length");
    if (contentLength) responseHeaders["Content-Length"] = contentLength;

    return new Response(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch {
    return new Response("Stream error", { status: 500 });
  }
}
