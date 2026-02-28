import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/domain/status-badge";
import { formatDate, formatDateTime } from "@/lib/utils/format-date";
import { VersionForm } from "./_components/version-form";
import { StatusAction } from "./_components/status-action";
import { FeedbackSection } from "./_components/feedback-section";
import { TranscriptionSection } from "@/components/domain/transcription-section";

export default async function CreatorVideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

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

  if (!video) notFound();

  // Ensure the creator can only view their own videos
  if (video.creatorId !== session.id && session.role === "CREATOR") {
    notFound();
  }

  // Serialize feedbacks for the client component
  const serializedFeedbacks = video.feedbacks.map((fb) => ({
    id: fb.id,
    comment: fb.comment,
    videoTimestamp: fb.videoTimestamp,
    createdAt: fb.createdAt.toISOString(),
    user: fb.user,
    version: fb.version,
  }));

  const versionOptions = video.versions.map((v) => ({
    id: v.id,
    versionNumber: v.versionNumber,
  }));

  return (
    <PageContainer
      title={video.title}
      action={
        <Link href="/creator/videos">
          <Button variant="secondary">一覧に戻る</Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Video info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">動画情報</h2>
              <StatusAction videoId={video.id} currentStatus={video.status} />
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">動画コード</dt>
                <dd className="mt-1 text-sm text-gray-900">{video.videoCode}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">案件</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {video.project.name}
                  <span className="ml-1 text-gray-500">({video.project.projectCode})</span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">ステータス</dt>
                <dd className="mt-1">
                  <StatusBadge status={video.status} />
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">ディレクター</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {video.director?.name ?? "未割当"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">締切日</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {video.deadline ? formatDate(video.deadline) : "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">作成日</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(video.createdAt)}
                </dd>
              </div>
            </dl>

            {/* Reference URLs */}
            {video.referenceUrls.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">参考URL</h3>
                <ul className="space-y-1">
                  {video.referenceUrls.map((ref) => (
                    <li key={ref.id}>
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 hover:text-primary-800 hover:underline break-all"
                      >
                        {ref.url}
                      </a>
                      {ref.platform && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({ref.platform})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Version history */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">バージョン履歴</h2>
          </CardHeader>
          <CardContent>
            {video.versions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        バージョン
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        ファイル名
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        ファイルサイズ
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        アップロード者
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        アップロード日時
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Google Drive
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {video.versions.map((version) => (
                      <tr key={version.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                          v{version.versionNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                          {version.fileName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                          {formatFileSize(version.fileSize.toString())}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                          {version.uploader.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                          {formatDateTime(version.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          {version.googleDriveUrl ? (
                            <a
                              href={version.googleDriveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-800 hover:underline"
                            >
                              リンクを開く
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">バージョンはまだ登録されていません</p>
            )}
          </CardContent>
        </Card>

        {/* Transcription Section */}
        {video.versions[0] && (
          <TranscriptionSection
            videoId={video.id}
            versionId={video.versions[0].id}
            initialTelopText={video.versions[0].telopText ?? null}
            initialTelopExtractedAt={video.versions[0].telopExtractedAt?.toISOString() ?? null}
            initialAudioText={video.versions[0].audioText ?? null}
            initialAudioExtractedAt={video.versions[0].audioExtractedAt?.toISOString() ?? null}
          />
        )}

        {/* New version form */}
        <VersionForm videoId={video.id} />

        {/* Feedback section */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">フィードバック</h2>
          <FeedbackSection
            videoId={video.id}
            feedbacks={serializedFeedbacks}
            versions={versionOptions}
          />
        </div>
      </div>
    </PageContainer>
  );
}

function formatFileSize(bytes: string): string {
  const size = parseInt(bytes, 10);
  if (size === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(size) / Math.log(1024));
  const value = size / Math.pow(1024, i);
  return `${value.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}
