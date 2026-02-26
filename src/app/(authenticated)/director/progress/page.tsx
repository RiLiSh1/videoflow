import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/domain/status-badge";
import { VIDEO_STATUS_ORDER } from "@/lib/constants/video-status";
import { formatRelative } from "@/lib/utils/format-date";
import type { VideoStatus } from "@prisma/client";
import {
  ClipboardList,
  Clock,
  Eye,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

export default async function DirectorProgressPage() {
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
    },
    orderBy: { updatedAt: "desc" },
  });

  // Summary counts
  const totalAssigned = videos.length;
  const pendingReview = videos.filter(
    (v) => v.status === "SUBMITTED" || v.status === "REVISED"
  ).length;
  const inReview = videos.filter((v) => v.status === "IN_REVIEW").length;
  const completed = videos.filter(
    (v) => v.status === "COMPLETED" || v.status === "APPROVED"
  ).length;

  // Unreviewed videos: not yet approved or rejected
  const unreviewedStatuses: VideoStatus[] = [
    "SUBMITTED",
    "IN_REVIEW",
    "REVISED",
    "REVISION_REQUESTED",
  ];
  const unreviewedVideos = videos.filter((v) =>
    unreviewedStatuses.includes(v.status)
  );

  // Group by project
  const projectMap = new Map<
    string,
    {
      projectCode: string;
      name: string;
      videos: typeof videos;
      statusCounts: Partial<Record<VideoStatus, number>>;
    }
  >();

  for (const video of videos) {
    const key = video.project.id;
    if (!projectMap.has(key)) {
      projectMap.set(key, {
        projectCode: video.project.projectCode,
        name: video.project.name,
        videos: [],
        statusCounts: {},
      });
    }
    const entry = projectMap.get(key)!;
    entry.videos.push(video);
    entry.statusCounts[video.status] =
      (entry.statusCounts[video.status] || 0) + 1;
  }

  const projects = Array.from(projectMap.values()).sort((a, b) =>
    a.projectCode.localeCompare(b.projectCode)
  );

  const summaryCards = [
    {
      label: "担当動画数",
      value: totalAssigned,
      icon: ClipboardList,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "レビュー待ち",
      value: pendingReview,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "レビュー中",
      value: inReview,
      icon: Eye,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      label: "承認・完了",
      value: completed,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];

  return (
    <PageContainer title="進捗管理">
      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardContent>
              <div className="flex items-center gap-3 py-2 sm:gap-4">
                <div className={`rounded-lg p-2.5 sm:p-3 ${card.bgColor}`}>
                  <card.icon
                    className={`h-5 w-5 sm:h-6 sm:w-6 ${card.color}`}
                  />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">
                    {card.label}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {card.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Unreviewed Videos */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-gray-900">
            未レビュー動画
          </h2>
          {unreviewedVideos.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
              {unreviewedVideos.length}
            </span>
          )}
        </div>

        {unreviewedVideos.length === 0 ? (
          <Card>
            <CardContent>
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-green-300 mb-2" />
                <p className="text-sm text-gray-500">
                  すべての動画がレビュー済みです
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-3 text-left font-medium text-gray-500">
                        動画コード
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">
                        タイトル
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">
                        案件
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">
                        クリエイター
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">
                        ステータス
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">
                        更新日時
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500">

                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {unreviewedVideos.map((video) => {
                      const isUrgent = ["SUBMITTED", "REVISED"].includes(
                        video.status
                      );
                      return (
                        <tr
                          key={video.id}
                          className={`hover:bg-gray-50 transition-colors ${
                            isUrgent ? "bg-amber-50/30" : ""
                          }`}
                        >
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">
                            {video.videoCode}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/director/reviews/${video.id}`}
                              className="font-medium text-primary-600 hover:text-primary-800 hover:underline"
                            >
                              {video.title}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {video.project.name}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {video.creator.name}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={video.status} />
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {formatRelative(video.updatedAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/director/reviews/${video.id}`}
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-800"
                            >
                              レビュー
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Progress by Project */}
      <h2 className="mb-4 text-lg font-semibold text-gray-900">案件別進捗</h2>

      {projects.length === 0 ? (
        <Card>
          <CardContent>
            <p className="py-6 text-center text-sm text-gray-500">
              担当する案件がまだありません
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const total = project.videos.length;
            const completedCount =
              (project.statusCounts["COMPLETED"] || 0) +
              (project.statusCounts["APPROVED"] || 0);
            const progressPercent =
              total > 0 ? Math.round((completedCount / total) * 100) : 0;

            return (
              <Card key={project.projectCode}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        {project.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {project.projectCode}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">
                        {completedCount} / {total} 完了
                      </p>
                      <p className="text-xs text-gray-500">
                        {progressPercent}%
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-green-500 transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Status breakdown */}
                  <div className="flex flex-wrap gap-3">
                    {VIDEO_STATUS_ORDER.map((status) => {
                      const count = project.statusCounts[status];
                      if (!count) return null;
                      return (
                        <div
                          key={status}
                          className="flex items-center gap-1.5"
                        >
                          <StatusBadge status={status} />
                          <span className="text-sm font-medium text-gray-700">
                            {count}件
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
