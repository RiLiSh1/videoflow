import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/domain/status-badge";
import { formatDate } from "@/lib/utils/format-date";
import { AdminReviewClient } from "./_components/admin-review-client";
import { VideoWithTranscription } from "@/app/(authenticated)/director/reviews/[id]/_components/video-with-transcription";
import { ArrowLeft, ExternalLink } from "lucide-react";

export default async function AdminApprovalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  const video = await prisma.video.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, projectCode: true, name: true } },
      creator: { select: { id: true, name: true } },
      director: { select: { id: true, name: true } },
      referenceUrls: { orderBy: { sortOrder: "asc" } },
      versions: {
        include: {
          uploader: { select: { id: true, name: true } },
        },
        orderBy: { versionNumber: "desc" },
      },
      feedbacks: {
        include: {
          user: { select: { id: true, name: true, role: true } },
          version: { select: { id: true, versionNumber: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!video) {
    notFound();
  }

  const latestVersion = video.versions[0] ?? null;

  const serializedVersions = video.versions.map((v) => ({
    id: v.id,
    versionNumber: v.versionNumber,
    fileName: v.fileName,
    fileSize: Number(v.fileSize),
    mimeType: v.mimeType,
    googleDriveUrl: v.googleDriveUrl,
    uploaderName: v.uploader.name,
    createdAt: v.createdAt.toISOString(),
    telopText: v.telopText ?? null,
    telopExtractedAt: v.telopExtractedAt?.toISOString() ?? null,
    audioText: v.audioText ?? null,
    audioExtractedAt: v.audioExtractedAt?.toISOString() ?? null,
  }));

  const serializedFeedbacks = video.feedbacks.map((f) => ({
    id: f.id,
    comment: f.comment,
    videoTimestamp: f.videoTimestamp,
    actionType: f.actionType,
    createdAt: f.createdAt.toISOString(),
    user: f.user,
    version: f.version,
  }));

  return (
    <PageContainer title="動画詳細">
      {/* Header: Back link + Video meta */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <Link
            href="/admin/approvals"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            承認一覧に戻る
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">{video.title}</h1>
            <StatusBadge status={video.status} />
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
            <span className="font-mono">{video.videoCode}</span>
            <span>・</span>
            <span>{video.project.name}</span>
            <span>・</span>
            <span>{video.creator.name}</span>
          </div>
        </div>
      </div>

      {/* Main: Video Player + Feedback side by side */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Left: Video Player + Version selector */}
        <div className="space-y-4 xl:col-span-3">
          {/* Video Player + Transcription */}
          {latestVersion?.googleDriveUrl ? (
            <VideoWithTranscription
              videoId={video.id}
              directStreamUrl={directStreamUrl}
              version={{
                id: latestVersion.id,
                versionNumber: latestVersion.versionNumber,
                fileName: latestVersion.fileName,
                fileSize: Number(latestVersion.fileSize),
                googleDriveUrl: latestVersion.googleDriveUrl,
                telopText: latestVersion.telopText ?? null,
                telopExtractedAt: latestVersion.telopExtractedAt?.toISOString() ?? null,
                audioText: latestVersion.audioText ?? null,
                audioExtractedAt: latestVersion.audioExtractedAt?.toISOString() ?? null,
              }}
            />
          ) : (
            <Card className="overflow-hidden">
              <div className="bg-black">
                <div className="aspect-video flex items-center justify-center">
                  <p className="text-gray-400 text-sm">
                    動画がまだアップロードされていません
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Version History */}
          {video.versions.length > 1 && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-gray-900">
                  バージョン履歴
                </h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {video.versions.map((version) => (
                    <div
                      key={version.id}
                      className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          v{version.versionNumber}
                        </span>
                        <span className="text-xs text-gray-500">
                          {version.fileName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {formatDate(version.createdAt)}
                        </span>
                        {version.googleDriveUrl && (
                          <a
                            href={version.googleDriveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-800"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reference URLs */}
          {video.referenceUrls.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-gray-900">参考URL</h2>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {video.referenceUrls.map((ref) => (
                    <li key={ref.id}>
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-800 hover:underline break-all"
                      >
                        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                        {ref.platform ? (
                          <span>
                            <span className="font-medium">[{ref.platform}]</span>{" "}
                            {ref.url}
                          </span>
                        ) : (
                          ref.url
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Feedback form + Actions + History */}
        <div className="space-y-4 xl:col-span-2">
          <AdminReviewClient
            videoId={video.id}
            currentStatus={video.status}
            latestVersion={
              latestVersion
                ? {
                    id: latestVersion.id,
                    versionNumber: latestVersion.versionNumber,
                  }
                : null
            }
            feedbacks={serializedFeedbacks}
            versions={serializedVersions}
          />
        </div>
      </div>
    </PageContainer>
  );
}
