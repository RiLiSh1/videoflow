import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const filePath = path.join(UPLOAD_DIR, ...pathSegments);

    // Prevent directory traversal
    if (!filePath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json(
        { success: false, error: "アクセスが拒否されました" },
        { status: 403 }
      );
    }

    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return NextResponse.json(
        { success: false, error: "ファイルが見つかりません" },
        { status: 404 }
      );
    }

    const fileBuffer = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();

    const mimeTypes: Record<string, string> = {
      ".mp4": "video/mp4",
      ".mov": "video/quicktime",
      ".avi": "video/x-msvideo",
      ".mkv": "video/x-matroska",
      ".webm": "video/webm",
      ".mpeg": "video/mpeg",
      ".mpg": "video/mpeg",
      ".wmv": "video/x-ms-wmv",
      ".flv": "video/x-flv",
      ".3gp": "video/3gpp",
      ".ogv": "video/ogg",
    };

    const contentType = mimeTypes[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileStat.size.toString(),
        "Content-Disposition": `inline; filename="${path.basename(filePath)}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "ファイルが見つかりません" },
      { status: 404 }
    );
  }
}
