import { prisma } from "@/lib/db";
import { PageContainer } from "@/components/layout/page-container";
import { ApprovalsClient } from "./_components/approvals-client";

async function getAllVideos() {
  const videos = await prisma.video.findMany({
    where: {
      status: { not: "DRAFT" },
    },
    include: {
      project: { select: { projectCode: true, name: true } },
      creator: { select: { name: true } },
      director: { select: { name: true } },
      versions: {
        take: 1,
        orderBy: { versionNumber: "desc" },
        select: { googleDriveFileId: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return videos.map((v) => ({
    id: v.id,
    videoCode: v.videoCode,
    title: v.title,
    status: v.status,
    updatedAt: v.updatedAt.toISOString(),
    project: v.project,
    creator: v.creator,
    director: v.director,
    _fileId: v.versions[0]?.googleDriveFileId ?? null,
  }));
}

export default async function AdminApprovalsPage() {
  const videos = await getAllVideos();

  // Prefetch video streams for actionable videos (max 3)
  const prefetchFileIds = videos
    .filter((v) =>
      ["SUBMITTED", "IN_REVIEW", "FINAL_REVIEW", "REVISED"].includes(v.status)
    )
    .slice(0, 3)
    .map((v) => v._fileId)
    .filter(Boolean) as string[];

  // Strip _fileId before passing to client component
  const clientVideos = videos.map(({ _fileId, ...rest }) => rest);

  return (
    <PageContainer title="承認管理">
      {/* Prefetch: browser loads video data during idle time */}
      {prefetchFileIds.map((fileId) => (
        <link
          key={fileId}
          rel="prefetch"
          href={`/api/drive/stream/${fileId}`}
          as="video"
          type="video/mp4"
        />
      ))}
      <ApprovalsClient videos={clientVideos} />
    </PageContainer>
  );
}
