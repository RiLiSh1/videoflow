import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/domain/status-badge";
import { formatRelative } from "@/lib/utils/format-date";
import type { VideoStatus } from "@prisma/client";
import {
  ClipboardList,
  Clock,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  PlayCircle,
} from "lucide-react";

export default async function DirectorDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const videos = await prisma.video.findMany({
    where: { directorId: session.id },
    include: {
      project: { select: { id: true, projectCode: true, name: true } },
      creator: { select: { id: true, name: true } },
      _count: { select: { feedbacks: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Summary counts
  const totalAssigned = videos.length;
  const pendingReview = videos.filter(
    (v) => v.status === "SUBMITTED" || v.status === "REVISED"
  );
  const inReview = videos.filter((v) => v.status === "IN_REVIEW");
  const revisionRequested = videos.filter(
    (v) => v.status === "REVISION_REQUESTED"
  );
  const completed = videos.filter(
    (v) => v.status === "COMPLETED" || v.status === "APPROVED"
  );

  // Recent activity (last 10 updated)
  const recentVideos = videos.slice(0, 8);

  // Urgent: pending review items (needs action)
  const actionRequired = [...pendingReview, ...inReview].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );

  const summaryCards = [
    {
      label: "担当動画数",
      value: totalAssigned,
      icon: ClipboardList,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      label: "レビュー待ち",
      value: pendingReview.length,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      urgent: pendingReview.length > 0,
    },
    {
      label: "修正依頼中",
      value: revisionRequested.length,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
    {
      label: "承認・完了",
      value: completed.length,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
  ];

  // Group by project for progress overview
  const projectMap = new Map<
    string,
    {
      projectCode: string;
      name: string;
      total: number;
      completed: number;
      statusCounts: Partial<Record<VideoStatus, number>>;
    }
  >();

  for (const video of videos) {
    const key = video.project.id;
    if (!projectMap.has(key)) {
      projectMap.set(key, {
        projectCode: video.project.projectCode,
        name: video.project.name,
        total: 0,
        completed: 0,
        statusCounts: {},
      });
    }
    const entry = projectMap.get(key)!;
    entry.total++;
    if (video.status === "COMPLETED" || video.status === "APPROVED") {
      entry.completed++;
    }
    entry.statusCounts[video.status] =
      (entry.statusCounts[video.status] || 0) + 1;
  }

  const projects = Array.from(projectMap.values()).sort(
    (a, b) => a.completed / a.total - b.completed / b.total
  );

  return (
    <PageContainer title="ダッシュボード">
      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card
            key={card.label}
            className={card.urgent ? `border-2 ${card.borderColor}` : ""}
          >
            <CardContent>
              <div className="flex items-center gap-3 py-2 sm:gap-4">
                <div className={`rounded-lg p-2.5 sm:p-3 ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${card.color}`} />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Action Required */}
        <div className="lg:col-span-2 space-y-6">
          {/* レビュー待ち */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <h2 className="text-base font-semibold text-gray-900">
                    対応が必要な動画
                  </h2>
                  {actionRequired.length > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                      {actionRequired.length}
                    </span>
                  )}
                </div>
                <Link
                  href="/director/reviews"
                  className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                >
                  一覧へ
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {actionRequired.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-green-300 mb-2" />
                  <p className="text-sm text-gray-500">
                    対応が必要な動画はありません
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {actionRequired.slice(0, 6).map((video) => (
                    <Link
                      key={video.id}
                      href={`/director/reviews/${video.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors sm:px-6"
                    >
                      <PlayCircle className="h-8 w-8 text-gray-300 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {video.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {video.project.name} ・ {video.creator.name}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <StatusBadge status={video.status} />
                        <span className="text-[11px] text-gray-400">
                          {formatRelative(video.updatedAt)}
                        </span>
                      </div>
                    </Link>
                  ))}
                  {actionRequired.length > 6 && (
                    <div className="px-6 py-2 text-center">
                      <Link
                        href="/director/reviews"
                        className="text-xs text-primary-600 hover:underline"
                      >
                        他 {actionRequired.length - 6} 件を表示
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 最近の更新 */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-gray-900">
                最近の更新
              </h2>
            </CardHeader>
            <CardContent className="p-0">
              {recentVideos.length === 0 ? (
                <p className="px-6 py-6 text-sm text-gray-500 text-center">
                  担当する動画がありません
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentVideos.map((video) => (
                    <Link
                      key={video.id}
                      href={`/director/reviews/${video.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors sm:px-6"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-900 truncate">
                          {video.title}
                        </p>
                        <p className="text-xs text-gray-400">
                          {video.videoCode} ・ {video.creator.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={video.status} />
                        <span className="hidden sm:inline text-[11px] text-gray-400 w-16 text-right">
                          {formatRelative(video.updatedAt)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Project Progress */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">
                  案件別進捗
                </h2>
                <Link
                  href="/director/progress"
                  className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                >
                  詳細
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <p className="py-4 text-sm text-gray-500 text-center">
                  担当案件がありません
                </p>
              ) : (
                <div className="space-y-5">
                  {projects.map((project) => {
                    const pct =
                      project.total > 0
                        ? Math.round(
                            (project.completed / project.total) * 100
                          )
                        : 0;
                    return (
                      <div key={project.projectCode}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {project.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {project.projectCode}
                            </p>
                          </div>
                          <span className="text-xs font-medium text-gray-600 flex-shrink-0 ml-2">
                            {project.completed}/{project.total} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-100">
                          <div
                            className="h-2 rounded-full bg-green-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
