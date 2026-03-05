import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

/**
 * 既存の完了動画を動画ストックに一括反映するバックフィルAPI
 * Admin-only, POST
 */
export async function POST() {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  // COMPLETED状態の動画で、まだストックに登録されていないものを取得
  const completedVideos = await prisma.video.findMany({
    where: {
      status: "COMPLETED",
      videoStock: null, // まだストックに連携されていない
    },
    include: {
      project: { select: { projectCode: true } },
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: {
          fileName: true,
          googleDriveFileId: true,
          googleDriveUrl: true,
          blobUrl: true,
        },
      },
    },
  });

  let created = 0;
  let skipped = 0;

  for (const video of completedVideos) {
    const latestVersion = video.versions[0];
    if (!latestVersion) {
      skipped++;
      continue;
    }

    try {
      await prisma.videoStock.create({
        data: {
          title: video.title,
          fileName: latestVersion.fileName,
          googleDriveFileId: latestVersion.googleDriveFileId,
          googleDriveUrl: latestVersion.googleDriveUrl,
          blobUrl: latestVersion.blobUrl,
          sourceVideoId: video.id,
          note: `動画システムから自動連携（${video.project.projectCode}）`,
        },
      });
      created++;
    } catch {
      // 重複の場合はスキップ
      skipped++;
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      total: completedVideos.length,
      created,
      skipped,
    },
  });
}
