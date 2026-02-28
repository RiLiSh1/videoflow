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
  }));
}

export default async function AdminApprovalsPage() {
  const videos = await getPendingVideos();

  return (
    <PageContainer title="承認管理">
      <ApprovalsClient videos={videos} />
    </PageContainer>
  );
}
