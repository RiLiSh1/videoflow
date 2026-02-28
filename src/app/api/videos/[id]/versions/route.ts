import { NextResponse } from "next/server";
import { headers as getHeaders } from "next/headers";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { shareFilePublicly } from "@/lib/google-drive";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN", "CREATOR"]);
  if (!isSessionUser(auth)) return auth;

  const { id } = await params;

  try {
    const body = await request.json();
    const { fileName, fileSize, mimeType, googleDriveFileId, googleDriveUrl } = body;

    if (!fileName) {
      return NextResponse.json(
        { success: false, error: "ファイル名は必須です" },
        { status: 400 }
      );
    }

    const video = await prisma.video.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!video) {
      return NextResponse.json(
        { success: false, error: "動画が見つかりません" },
        { status: 404 }
      );
    }

    // Get next version number
    const lastVersion = await prisma.version.findFirst({
      where: { videoId: id },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });

    const versionNumber = (lastVersion?.versionNumber || 0) + 1;

    // Share file publicly so it's viewable via embed
    if (googleDriveFileId) {
      try {
        await shareFilePublicly(googleDriveFileId);
      } catch (e) {
        console.error("Failed to share file publicly:", e);
      }
    }

    const version = await prisma.version.create({
      data: {
        videoId: id,
        versionNumber,
        fileName,
        fileSize: BigInt(fileSize || 0),
        mimeType: mimeType || null,
        googleDriveFileId: googleDriveFileId || null,
        googleDriveUrl: googleDriveUrl || null,
        uploadedBy: auth.id,
      },
      include: {
        uploader: { select: { id: true, name: true } },
      },
    });

    // Warm CDN cache in background (fire and forget)
    if (googleDriveFileId) {
      const reqHeaders = await getHeaders();
      const host = reqHeaders.get("host") || "localhost:3000";
      const proto = reqHeaders.get("x-forwarded-proto") || "https";
      const cookie = reqHeaders.get("cookie") || "";
      const warmUrl = `${proto}://${host}/api/drive/stream/${googleDriveFileId}`;
      // Fire and forget — don't await, don't block the response
      fetch(warmUrl, { headers: { Cookie: cookie } }).catch(() => {});
    }

    // Serialize BigInt for JSON
    const serialized = {
      ...version,
      fileSize: version.fileSize.toString(),
    };

    return NextResponse.json({ success: true, data: serialized }, { status: 201 });
  } catch (error) {
    console.error("Create version error:", error);
    return NextResponse.json(
      { success: false, error: "バージョンの作成に失敗しました" },
      { status: 500 }
    );
  }
}
