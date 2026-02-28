import { NextResponse } from "next/server";
import path from "path";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { extractAudioFromVideo } from "@/lib/gemini/extract-audio";
import { downloadFileFromDrive } from "@/lib/google-drive";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

type RouteParams = { params: Promise<{ id: string; versionId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isSessionUser(auth)) return auth;

  const { versionId } = await params;

  const version = await prisma.version.findUnique({
    where: { id: versionId },
    select: { audioText: true, audioExtractedAt: true },
  });

  if (!version) {
    return NextResponse.json(
      { success: false, error: "バージョンが見つかりません" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      audioText: version.audioText,
      audioExtractedAt: version.audioExtractedAt?.toISOString() ?? null,
    },
  });
}

export async function POST(_request: Request, { params }: RouteParams) {
  const auth = await requireAuth(["ADMIN", "DIRECTOR", "CREATOR"]);
  if (!isSessionUser(auth)) return auth;

  const { versionId } = await params;

  const version = await prisma.version.findUnique({
    where: { id: versionId },
    select: {
      id: true,
      googleDriveFileId: true,
      googleDriveUrl: true,
      mimeType: true,
      fileName: true,
    },
  });

  if (!version) {
    return NextResponse.json(
      { success: false, error: "バージョンが見つかりません" },
      { status: 404 }
    );
  }

  const mimeType = version.mimeType || "video/mp4";
  let fileData: string | Buffer;

  if (version.googleDriveFileId) {
    // Production: download from Google Drive
    try {
      fileData = await downloadFileFromDrive(version.googleDriveFileId);
    } catch (error) {
      console.error("Drive download error:", error);
      return NextResponse.json(
        { success: false, error: "Google Driveからのファイル取得に失敗しました" },
        { status: 500 }
      );
    }
  } else if (version.googleDriveUrl?.startsWith("/api/files/")) {
    // Development: local file path
    const localPrefix = "/api/files/";
    const relativePath = version.googleDriveUrl.slice(localPrefix.length);
    const filePath = path.join(UPLOAD_DIR, relativePath);

    if (!filePath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json(
        { success: false, error: "アクセスが拒否されました" },
        { status: 403 }
      );
    }
    fileData = filePath;
  } else {
    return NextResponse.json(
      { success: false, error: "動画ファイルが登録されていません" },
      { status: 400 }
    );
  }

  try {
    const result = await extractAudioFromVideo(fileData, mimeType);

    const updated = await prisma.version.update({
      where: { id: versionId },
      data: {
        audioText: result.rawText,
        audioExtractedAt: new Date(),
      },
      select: { audioText: true, audioExtractedAt: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        audioText: updated.audioText,
        audioExtractedAt: updated.audioExtractedAt?.toISOString() ?? null,
        entries: result.entries,
      },
    });
  } catch (error) {
    console.error("Audio extraction error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "音声抽出に失敗しました",
      },
      { status: 500 }
    );
  }
}
