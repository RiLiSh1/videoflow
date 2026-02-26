import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!isSessionUser(auth)) return auth;

  const { id } = await params;

  const [latestVersion, feedbacks, referenceUrls] = await Promise.all([
    prisma.version.findFirst({
      where: { videoId: id },
      orderBy: { versionNumber: "desc" },
      select: {
        versionNumber: true,
        fileName: true,
        googleDriveUrl: true,
      },
    }),
    prisma.feedback.findMany({
      where: { videoId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        comment: true,
        videoTimestamp: true,
        user: { select: { name: true, role: true } },
        version: { select: { versionNumber: true } },
      },
    }),
    prisma.referenceUrl.findMany({
      where: { videoId: id },
      orderBy: { sortOrder: "asc" },
      select: { url: true, platform: true },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: { latestVersion, feedbacks, referenceUrls },
  });
}
