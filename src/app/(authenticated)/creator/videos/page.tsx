import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { formatDate, formatRelative } from "@/lib/utils/format-date";
import { VideosTable } from "./_components/videos-table";

export default async function CreatorVideosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const videos = await prisma.video.findMany({
    where: { creatorId: session.id },
    include: {
      project: { select: { id: true, projectCode: true, name: true } },
      _count: { select: { versions: true, feedbacks: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const serializedVideos = videos.map((video) => ({
    id: video.id,
    videoCode: video.videoCode,
    title: video.title,
    projectName: video.project.name,
    status: video.status,
    createdAt: formatDate(video.createdAt),
    completedAt: video.status === "COMPLETED" ? formatDate(video.updatedAt) : "-",
    versionsCount: video._count.versions,
    feedbacksCount: video._count.feedbacks,
  }));

  return (
    <PageContainer
      title="マイ動画一覧"
      action={
        <Link href="/creator/upload">
          <Button>新規動画</Button>
        </Link>
      }
    >
      <VideosTable videos={serializedVideos} />
    </PageContainer>
  );
}
