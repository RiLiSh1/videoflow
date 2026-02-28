import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageContainer } from "@/components/layout/page-container";
import { ReviewsTable } from "./_components/reviews-table";

export default async function DirectorReviewsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const videos = await prisma.video.findMany({
    where: {
      directorId: session.id,
    },
    include: {
      project: { select: { id: true, projectCode: true, name: true } },
      creator: { select: { id: true, name: true } },
      director: { select: { id: true, name: true } },
      versions: {
        take: 1,
        orderBy: { versionNumber: "desc" },
        select: { blobUrl: true, googleDriveFileId: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Prefetch video URLs for reviewable videos (max 3)
  // Prefer Blob CDN URL (no auth needed, global CDN), fall back to stream proxy
  const prefetchUrls = videos
    .filter((v) => ["SUBMITTED", "IN_REVIEW", "REVISED"].includes(v.status))
    .slice(0, 3)
    .map((v) => {
      const ver = v.versions[0];
      if (!ver) return null;
      if (ver.blobUrl) return ver.blobUrl;
      if (ver.googleDriveFileId) return `/api/drive/stream/${ver.googleDriveFileId}`;
      return null;
    })
    .filter(Boolean) as string[];

  // Serialize dates for client component
  const serializedVideos = videos.map((video) => ({
    id: video.id,
    videoCode: video.videoCode,
    title: video.title,
    status: video.status,
    updatedAt: video.updatedAt.toISOString(),
    project: video.project,
    creator: video.creator,
  }));

  return (
    <PageContainer title="レビュー一覧">
      {/* Prefetch: browser loads video data during idle time */}
      {prefetchUrls.map((url) => (
        <link
          key={url}
          rel="prefetch"
          href={url}
          as="video"
          type="video/mp4"
        />
      ))}
      {serializedVideos.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white py-12 text-center">
          <p className="text-gray-500">担当する動画がまだありません</p>
        </div>
      ) : (
        <ReviewsTable videos={serializedVideos} />
      )}
    </PageContainer>
  );
}
