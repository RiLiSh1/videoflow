import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { getAccessTokenLite } from "@/lib/google-auth-lite";
import { put } from "@vercel/blob";

export const maxDuration = 300;

/**
 * Backfill all existing versions that have googleDriveFileId but no blobUrl.
 * Admin-only. Processes one at a time to stay within memory limits.
 */
export async function POST(request: Request) {
  // Admin only
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ success: false, error: "Blob storage not configured" });
  }

  const body = await request.json().catch(() => ({}));
  const limit = Math.min(body.limit || 5, 20);

  try {
    const versions = await prisma.version.findMany({
      where: {
        googleDriveFileId: { not: null },
        blobUrl: null,
      },
      select: {
        id: true,
        googleDriveFileId: true,
        fileName: true,
        mimeType: true,
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    if (versions.length === 0) {
      return NextResponse.json({ success: true, message: "All versions already have blobUrl", copied: 0 });
    }

    const results: { id: string; status: "ok" | "error"; blobUrl?: string; error?: string }[] = [];

    for (const ver of versions) {
      try {
        const accessToken = await getAccessTokenLite();
        const driveUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(ver.googleDriveFileId!)}?alt=media&supportsAllDrives=true`;
        const driveRes = await fetch(driveUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!driveRes.ok || !driveRes.body) {
          results.push({ id: ver.id, status: "error", error: `Drive fetch failed: ${driveRes.status}` });
          continue;
        }

        const blob = await put(
          `videos/${ver.googleDriveFileId}/${ver.fileName || "video.mp4"}`,
          driveRes.body,
          {
            access: "public",
            contentType: ver.mimeType || "video/mp4",
            addRandomSuffix: false,
          }
        );

        await prisma.version.update({
          where: { id: ver.id },
          data: { blobUrl: blob.url },
        });

        results.push({ id: ver.id, status: "ok", blobUrl: blob.url });
      } catch (e) {
        results.push({ id: ver.id, status: "error", error: String(e) });
      }
    }

    const remaining = await prisma.version.count({
      where: { googleDriveFileId: { not: null }, blobUrl: null },
    });

    return NextResponse.json({
      success: true,
      copied: results.filter((r) => r.status === "ok").length,
      failed: results.filter((r) => r.status === "error").length,
      remaining,
      results,
    });
  } catch (error) {
    console.error("Backfill error:", error);
    return NextResponse.json({ success: false, error: "Backfill failed" }, { status: 500 });
  }
}
