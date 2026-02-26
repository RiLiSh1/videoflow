import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/domain/status-badge";
import { formatDate, formatDateTime } from "@/lib/utils/format-date";
import { FeedbackForm } from "./_components/feedback-form";
import { StatusActions } from "./_components/status-actions";
import { FeedbackHistory } from "./_components/feedback-history";
import { ArrowLeft, ExternalLink, FileVideo, Clock } from "lucide-react";

export default async function DirectorReviewDetailPage({
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

  return (
    <PageContainer title="レビュー画面">
      <div className="mb-4">
        <Link
          href="/director/reviews"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          レビュー一覧に戻る
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Video info + Actions */}
        <div className="space-y-6 lg:col-span-2">
          {/* Video Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">動画情報</h2>
                <StatusBadge status={video.status} />
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">タイトル</dt>
                  <dd className="mt-1 text-sm text-gray-900">{video.title}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">動画コード</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{video.videoCode}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">案件</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {video.project.name}
                    <span className="ml-1 text-gray-500">({video.project.projectCode})</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">クリエイター</dt>
                  <dd className="mt-1 text-sm text-gray-900">{video.creator.name}</dd>
                </div>
                {video.deadline && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">納期</dt>
                    <dd className="mt-1 text-sm text-gray-900 flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      {formatDate(video.deadline)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">更新日時</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDateTime(video.updatedAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Status Actions */}
          {["SUBMITTED", "IN_REVIEW", "REVISED"].includes(video.status) && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">アクション</h2>
              </CardHeader>
              <CardContent>
                <StatusActions videoId={video.id} currentStatus={video.status} />
              </CardContent>
            </Card>
          )}

          {/* Feedback Form */}
          {latestVersion && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">フィードバック</h2>
              </CardHeader>
              <CardContent>
                <FeedbackForm
                  videoId={video.id}
                  versionId={latestVersion.id}
                  versionNumber={latestVersion.versionNumber}
                />
              </CardContent>
            </Card>
          )}

          {/* Feedback History */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">フィードバック履歴</h2>
            </CardHeader>
            <CardContent>
              <FeedbackHistory
                feedbacks={video.feedbacks.map((f) => ({
                  ...f,
                  createdAt: f.createdAt.toISOString(),
                }))}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right column: Version info + References */}
        <div className="space-y-6">
          {/* Latest Version */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">最新バージョン</h2>
            </CardHeader>
            <CardContent>
              {latestVersion ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileVideo className="h-5 w-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      バージョン {latestVersion.versionNumber}
                    </span>
                  </div>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-xs font-medium text-gray-500">ファイル名</dt>
                      <dd className="text-sm text-gray-900 break-all">{latestVersion.fileName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">ファイルサイズ</dt>
                      <dd className="text-sm text-gray-900">
                        {formatFileSize(latestVersion.fileSize)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">アップロード者</dt>
                      <dd className="text-sm text-gray-900">{latestVersion.uploader.name}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">アップロード日時</dt>
                      <dd className="text-sm text-gray-900">
                        {formatDateTime(latestVersion.createdAt)}
                      </dd>
                    </div>
                  </dl>
                  {latestVersion.googleDriveUrl && (
                    <a
                      href={latestVersion.googleDriveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Google Driveで開く
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">バージョンがまだアップロードされていません</p>
              )}
            </CardContent>
          </Card>

          {/* All Versions */}
          {video.versions.length > 1 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">バージョン履歴</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {video.versions.map((version) => (
                    <div
                      key={version.id}
                      className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2"
                    >
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          v{version.versionNumber}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
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
                <h2 className="text-lg font-semibold text-gray-900">参考URL</h2>
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
                            <span className="font-medium">[{ref.platform}]</span> {ref.url}
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
      </div>
    </PageContainer>
  );
}

function formatFileSize(bytes: bigint): string {
  const size = Number(bytes);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
