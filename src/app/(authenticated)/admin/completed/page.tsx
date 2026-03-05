import { prisma } from "@/lib/db";
import { PageContainer } from "@/components/layout/page-container";
import { CompletedTable } from "./_components/completed-table";

async function getCompletedData() {
  const [videos, deliveryClients] = await Promise.all([
    prisma.video.findMany({
      where: { status: "COMPLETED" },
      include: {
        project: { select: { projectCode: true, name: true } },
        creator: { select: { name: true } },
        director: { select: { name: true } },
        deliveryClient: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.deliveryClient.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    videos: videos.map((v) => ({
      id: v.id,
      videoCode: v.videoCode,
      title: v.title,
      status: v.status,
      deliveryScope: v.deliveryScope,
      deliveryClientId: v.deliveryClientId,
      deliveryClientName: v.deliveryClient?.name ?? null,
      menuCategory: v.menuCategory,
      menuCategoryNote: v.menuCategoryNote,
      updatedAt: v.updatedAt.toISOString(),
      project: v.project,
      creator: v.creator,
      director: v.director,
    })),
    deliveryClients,
  };
}

export default async function AdminCompletedPage() {
  const { videos, deliveryClients } = await getCompletedData();

  return (
    <PageContainer title="完了一覧">
      <CompletedTable videos={videos} deliveryClients={deliveryClients} />
    </PageContainer>
  );
}
