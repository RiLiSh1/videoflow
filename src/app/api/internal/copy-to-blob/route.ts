import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { getAccessTokenLite } from "@/lib/google-auth-lite";

export const maxDuration = 60;

export async function POST(request: Request) {
  // Auth: user session or internal warming token
  const warmToken = request.headers.get("X-Warm-Token");
  const jwtSecret = process.env.JWT_SECRET;
  if (warmToken && jwtSecret && warmToken === jwtSecret) {
    // Internal call — OK
  } else {
    const auth = await requireAuth(["ADMIN", "CREATOR"]);
    if (!isSessionUser(auth)) return auth;
  }

  // Skip if Blob storage not configured
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ success: false, error: "Blob storage not configured" });
  }

  try {
    const { versionId, googleDriveFileId, fileName, mimeType } =
      await request.json();

    if (!versionId || !googleDriveFileId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if already copied
    const version = await prisma.version.findUnique({
      where: { id: versionId },
      select: { blobUrl: true },
    });
    if (version?.blobUrl) {
      return NextResponse.json({ success: true, data: { blobUrl: version.blobUrl } });
    }

    // Download from Google Drive (streaming)
    const accessToken = await getAccessTokenLite();
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(googleDriveFileId)}?alt=media&supportsAllDrives=true`;

    const driveRes = await fetch(driveUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!driveRes.ok || !driveRes.body) {
      return NextResponse.json(
        { success: false, error: "Failed to download from Google Drive" },
        { status: 502 }
      );
    }

    // Stream directly to Vercel Blob (no buffering)
    const blob = await put(
      `videos/${googleDriveFileId}/${fileName || "video.mp4"}`,
      driveRes.body,
      {
        access: "public",
        contentType: mimeType || "video/mp4",
        addRandomSuffix: false,
      }
    );

    // Update version record with Blob URL
    await prisma.version.update({
      where: { id: versionId },
      data: { blobUrl: blob.url },
    });

    return NextResponse.json({ success: true, data: { blobUrl: blob.url } });
  } catch (error) {
    console.error("Copy to blob error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to copy to blob storage" },
      { status: 500 }
    );
  }
}
