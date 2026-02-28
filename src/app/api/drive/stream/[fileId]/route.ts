import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { getAuthClient } from "@/lib/google-drive";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const auth = await requireAuth(["ADMIN", "CREATOR", "DIRECTOR"]);
  if (!isSessionUser(auth)) return auth;

  const { fileId } = await params;

  try {
    const accessToken = await getAuthClient();

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) {
      return new Response("File not found", { status: 404 });
    }

    return new Response(res.body, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "video/mp4",
        "Cache-Control": "public, max-age=3600",
        "Accept-Ranges": "bytes",
      },
    });
  } catch {
    return new Response("Stream error", { status: 500 });
  }
}
