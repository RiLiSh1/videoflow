import { NextResponse } from "next/server";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import {
  findOrCreateFolder,
  createResumableUploadSession,
  getRootFolderId,
} from "@/lib/google-drive";

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN", "CREATOR"]);
  if (!isSessionUser(auth)) return auth;

  try {
    const { fileName, mimeType, videoId } = await request.json();

    if (!fileName || !mimeType) {
      return NextResponse.json(
        { success: false, error: "fileName and mimeType are required" },
        { status: 400 }
      );
    }

    const rootFolderId = await getRootFolderId();
    let targetFolderId = rootFolderId;

    if (videoId) {
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: {
          videoCode: true,
          googleDriveFolderId: true,
          creator: {
            select: { id: true, name: true, googleDriveFolderId: true },
          },
          project: {
            select: { projectCode: true },
          },
        },
      });

      if (video) {
        // Find or create creator folder
        const creatorFolderId =
          video.creator.googleDriveFolderId ||
          (await findOrCreateFolder(video.creator.name, rootFolderId));

        if (!video.creator.googleDriveFolderId) {
          await prisma.user.update({
            where: { id: video.creator.id },
            data: { googleDriveFolderId: creatorFolderId },
          });
        }

        // Find or create project folder under creator folder
        const projectFolderId = await findOrCreateFolder(
          video.project.projectCode,
          creatorFolderId
        );

        // Find or create video folder
        targetFolderId =
          video.googleDriveFolderId ||
          (await findOrCreateFolder(video.videoCode, projectFolderId));

        if (!video.googleDriveFolderId) {
          await prisma.video.update({
            where: { id: videoId },
            data: { googleDriveFolderId: targetFolderId },
          });
        }
      }
    }

    // Pass the browser's Origin so Google Drive sets CORS headers for the upload URL
    const origin = request.headers.get("Origin") || request.headers.get("Referer")?.replace(/\/[^/]*$/, "") || undefined;

    const { uploadUrl } = await createResumableUploadSession({
      fileName,
      mimeType,
      parentFolderId: targetFolderId,
      origin: origin || undefined,
    });

    return NextResponse.json({
      success: true,
      data: { uploadUrl },
    });
  } catch (error) {
    console.error("Drive session creation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `アップロードセッションの作成に失敗しました: ${message}` },
      { status: 500 }
    );
  }
}
