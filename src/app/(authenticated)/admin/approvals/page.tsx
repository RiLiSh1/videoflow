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
        select: { blobUrl: true, googleDriveFileId: true },
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
    _blobUrl: v.versions[0]?.blobUrl ?? null,
    _fileId: v.versions[0]?.googleDriveFileId ?? null,
  }));
}

export default async function AdminApprovalsPage() {
  const videos = await getAllVideos();

  // Prefetch video URLs for actionable videos (max 3)
  const prefetchUrls = videos
    .filter((v) =>
      ["SUBMITTED", "IN_REVIEW", "FINAL_REVIEW", "REVISED"].includes(v.status)
    )
    .slice(0, 3)
    .map((v) => {
      if (v._blobUrl) return v._blobUrl;
      if (v._fileId) return `/api/drive/stream/${v._fileId}`;
      return null;
    })
    .filter(Boolean) as string[];

  // Strip internal fields before passing to client component
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const clientVideos = videos.map(({ _blobUrl, _fileId, ...rest }) => rest);

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
