import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAccessTokenLite } from "@/lib/google-auth-lite";

/**
 * Returns a direct Google Drive URL with embedded access token.
 * The client can use this URL as video.src to stream directly from
 * Google Drive CDN, bypassing our proxy entirely.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "認証が必要です" },
      { status: 401 }
    );
  }

  const { fileId } = await params;

  try {
    const accessToken = await getAccessTokenLite();
    const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true&access_token=${accessToken}`;

    return NextResponse.json(
      { url },
      {
        headers: {
          // Cache for 40 min (token valid for ~50 min)
          "Cache-Control": "private, max-age=2400",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to generate stream URL" },
      { status: 500 }
    );
  }
}
