import { prisma } from "@/lib/db";
import { PageContainer } from "@/components/layout/page-container";
import { AdminReviewsTable } from "./_components/admin-reviews-table";

async function getReviewVideos() {
  const videos = await prisma.video.findMany({
    where: {
      status: {
        in: [
          "SUBMITTED",
          "IN_REVIEW",
          "REVISION_REQUESTED",
          "REVISED",
          "APPROVED",
          "FINAL_REVIEW",
        ],
      },
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

export default async function AdminReviewsPage() {
  const videos = await getReviewVideos();

  return (
    <PageContainer title="レビュー一覧">
      <AdminReviewsTable videos={videos} />
    </PageContainer>
  );
}
