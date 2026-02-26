import { NextResponse } from "next/server";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/webm",
  "video/mpeg",
  "video/x-ms-wmv",
  "video/x-flv",
  "video/3gpp",
  "video/ogg",
];

const ALLOWED_EXTENSIONS = [
  ".mp4", ".mov", ".avi", ".mkv", ".webm",
  ".mpeg", ".mpg", ".wmv", ".flv", ".3gp", ".ogv",
];

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN", "CREATOR"]);
  if (!isSessionUser(auth)) return auth;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const videoId = formData.get("videoId") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "ファイルが選択されていません" },
        { status: 400 }
      );
    }

    // Validate file type
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "対応していないファイル形式です。動画ファイルを選択してください。" },
        { status: 400 }
      );
    }

    // Create upload directory: uploads/{videoId or 'temp'}/{timestamp}
    const subDir = videoId || "temp";
    const uploadDir = path.join(UPLOAD_DIR, subDir);
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueFileName = `${timestamp}_${sanitizedName}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    // Write file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return file metadata
    const relativePath = `${subDir}/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        filePath: relativePath,
        url: `/api/files/${relativePath}`,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "ファイルのアップロードに失敗しました" },
      { status: 500 }
    );
  }
}
