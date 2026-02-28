import { prisma } from "@/lib/db";
import { PageContainer } from "@/components/layout/page-container";
import { CompletedTable } from "./_components/completed-table";

async function getCompletedVideos() {
  const videos = await prisma.video.findMany({
    where: {
      status: "COMPLETED",
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

export default async function AdminCompletedPage() {
  const videos = await getCompletedVideos();

  return (
    <PageContainer title="完了一覧">
      <CompletedTable videos={videos} />
    </PageContainer>
  );
}
