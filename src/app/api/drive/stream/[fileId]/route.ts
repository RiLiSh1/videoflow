import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAuthClient } from "@/lib/google-drive";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  // Lightweight auth: JWT verification only (no DB, no role check)
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ success: false, error: "認証が必要です" }, { status: 401 });
  }

  const { fileId } = await params;

  try {
    const accessToken = await getAuthClient();
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`;

    // Forward Range header for partial content (fast seek & initial load)
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };
    const range = request.headers.get("Range");
    if (range) {
      headers["Range"] = range;
    }

    const res = await fetch(url, { headers });

    if (!res.ok && res.status !== 206) {
      return new Response("File not found", { status: 404 });
    }

    const responseHeaders: Record<string, string> = {
      "Content-Type": res.headers.get("Content-Type") || "video/mp4",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=86400, immutable",
    };

    // Forward partial content headers
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
