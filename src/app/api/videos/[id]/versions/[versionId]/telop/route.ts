import { NextResponse } from "next/server";
import path from "path";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { extractTelopFromVideo } from "@/lib/gemini/extract-telop";
import { downloadFileFromDrive } from "@/lib/google-drive";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

type RouteParams = { params: Promise<{ id: string; versionId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireAuth();
  if (!isSessionUser(auth)) return auth;

  const { versionId } = await params;

  const version = await prisma.version.findUnique({
    where: { id: versionId },
    select: { telopText: true, telopExtractedAt: true },
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
      telopText: version.telopText,
      telopExtractedAt: version.telopExtractedAt?.toISOString() ?? null,
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
    const result = await extractTelopFromVideo(fileData, mimeType);

    const updated = await prisma.version.update({
      where: { id: versionId },
      data: {
        telopText: result.rawText,
        telopExtractedAt: new Date(),
      },
      select: { telopText: true, telopExtractedAt: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        telopText: updated.telopText,
        telopExtractedAt: updated.telopExtractedAt?.toISOString() ?? null,
        telops: result.telops,
      },
    });
  } catch (error) {
    console.error("Telop extraction error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "テロップ抽出に失敗しました",
      },
      { status: 500 }
    );
  }
}
