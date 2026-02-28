import { NextResponse } from "next/server";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import {
  findOrCreateFolder,
  uploadFileToDrive,
  getRootFolderId,
} from "@/lib/google-drive";

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

    // Read file into buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save locally (for telop/audio extraction)
    const subDir = videoId || "temp";
    const uploadDir = path.join(UPLOAD_DIR, subDir);
    await mkdir(uploadDir, { recursive: true });
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueFileName = `${timestamp}_${sanitizedName}`;
    const filePath = path.join(uploadDir, uniqueFileName);
    await writeFile(filePath, buffer);

    const relativePath = `${subDir}/${uniqueFileName}`;
    const localUrl = `/api/files/${relativePath}`;

    // Try uploading to Google Drive
    let googleDriveUrl: string | null = null;
    let googleDriveFileId: string | null = null;

    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY && process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID) {
      try {
        const rootFolderId = await getRootFolderId();

        // Determine folder: use video's project folder structure
        let targetFolderId = rootFolderId;

        if (videoId) {
          const video = await prisma.video.findUnique({
            where: { id: videoId },
            select: {
              videoCode: true,
              googleDriveFolderId: true,
              project: { select: { projectCode: true, googleDriveFolderId: true } },
            },
          });

          if (video) {
            // Find or create project folder
            const projectFolderId = video.project.googleDriveFolderId
              || await findOrCreateFolder(video.project.projectCode, rootFolderId);

            // Save project folder ID if new
            if (!video.project.googleDriveFolderId) {
              await prisma.project.updateMany({
                where: { projectCode: video.project.projectCode },
                data: { googleDriveFolderId: projectFolderId },
              });
            }

            // Find or create video folder
            targetFolderId = video.googleDriveFolderId
              || await findOrCreateFolder(video.videoCode, projectFolderId);

            // Save video folder ID if new
            if (!video.googleDriveFolderId) {
              await prisma.video.update({
                where: { id: videoId },
                data: { googleDriveFolderId: targetFolderId },
              });
            }
          }
        }

        const driveResult = await uploadFileToDrive({
          fileName: file.name,
          mimeType: file.type || "video/mp4",
          buffer,
          parentFolderId: targetFolderId,
        });

        googleDriveUrl = driveResult.webViewLink;
        googleDriveFileId = driveResult.fileId;
      } catch (error) {
        console.error("Google Drive upload failed (continuing with local):", error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        filePath: relativePath,
        url: localUrl,
        googleDriveUrl,
        googleDriveFileId,
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
