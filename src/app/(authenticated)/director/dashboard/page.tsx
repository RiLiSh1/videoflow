import { redirect } from "next/navigation";
import Link from "next/link";
import { unstable_cache } from "next/cache";
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
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  PlayCircle,
} from "lucide-react";

// Cache dashboard data per director for 30 seconds
const getDashboardData = unstable_cache(
  async (directorId: string) => {
    const [statusCounts, actionVideos, recentVideos, projectProgress] =
      await Promise.all([
        prisma.video.groupBy({
          by: ["status"],
          where: { directorId },
          _count: true,
        }),
        prisma.video.findMany({
          where: {
            directorId,
            status: { in: ["SUBMITTED", "REVISED", "IN_REVIEW"] },
          },
          select: {
            id: true,
            title: true,
            status: true,
            updatedAt: true,
            project: { select: { name: true } },
            creator: { select: { name: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 6,
        }),
        prisma.video.findMany({
          where: { directorId },
          select: {
            id: true,
            videoCode: true,
            title: true,
            status: true,
            updatedAt: true,
            creator: { select: { name: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 8,
        }),
        prisma.$queryRaw<
          {
            project_id: string;
            project_code: string;
            project_name: string;
            status: VideoStatus;
            cnt: bigint;
          }[]
        >`
        SELECT v.project_id, p.project_code, p.name AS project_name, v.status, COUNT(*)::bigint AS cnt
        FROM videos v
        JOIN projects p ON p.id = v.project_id
        WHERE v.director_id = ${directorId}
        GROUP BY v.project_id, p.project_code, p.name, v.status
        ORDER BY p.project_code
      `,
      ]);
    return { statusCounts, actionVideos, recentVideos, projectProgress };
  },
  ["director-dashboard"],
  { revalidate: 30, tags: ["director-dashboard"] }
);

export default async function DirectorDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const directorId = session.id;

  const {
    statusCounts,
    actionVideos,
    recentVideos,
    projectProgress,
  } = await getDashboardData(directorId);
    // 1. Summary counts — DB-level groupBy, no row data transferred
    prisma.video.groupBy({
      by: ["status"],
      where: { directorId },
      _count: true,
    }),

    // 2. Action required — only SUBMITTED/REVISED/IN_REVIEW, max 6
    prisma.video.findMany({
      where: {
        directorId,
        status: { in: ["SUBMITTED", "REVISED", "IN_REVIEW"] },
      },
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
        project: { select: { name: true } },
        creator: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),

    // 3. Recent updates — last 8, minimal fields
    prisma.video.findMany({
      where: { directorId },
      select: {
        id: true,
        videoCode: true,
        title: true,
        status: true,
        updatedAt: true,
        creator: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),

    // 4. Project progress — raw SQL for fast group-by with project info
    prisma.$queryRaw<
      { project_id: string; project_code: string; project_name: string; status: VideoStatus; cnt: bigint }[]
    >`
      SELECT v.project_id, p.project_code, p.name AS project_name, v.status, COUNT(*)::bigint AS cnt
      FROM videos v
      JOIN projects p ON p.id = v.project_id
      WHERE v.director_id = ${directorId}
      GROUP BY v.project_id, p.project_code, p.name, v.status
      ORDER BY p.project_code
    `,
  ]);

  // Process summary counts
  const countMap: Partial<Record<VideoStatus, number>> = {};
  let totalAssigned = 0;
  for (const row of statusCounts) {
    countMap[row.status] = row._count;
    totalAssigned += row._count;
  }
  const pendingCount = (countMap["SUBMITTED"] || 0) + (countMap["REVISED"] || 0);
  const revisionCount = countMap["REVISION_REQUESTED"] || 0;
  const completedCount = (countMap["COMPLETED"] || 0) + (countMap["APPROVED"] || 0);

  // Process project progress
  const projectMap = new Map<string, { code: string; name: string; total: number; completed: number }>();
  for (const row of projectProgress) {
    const key = row.project_id;
    if (!projectMap.has(key)) {
      projectMap.set(key, { code: row.project_code, name: row.project_name, total: 0, completed: 0 });
    }
    const entry = projectMap.get(key)!;
    const cnt = Number(row.cnt);
    entry.total += cnt;
    if (row.status === "COMPLETED" || row.status === "APPROVED") {
      entry.completed += cnt;
    }
  }
  const projects = Array.from(projectMap.values()).sort(
    (a, b) => (a.total > 0 ? a.completed / a.total : 0) - (b.total > 0 ? b.completed / b.total : 0)
  );

  const summaryCards = [
    { label: "担当動画数", value: totalAssigned, icon: ClipboardList, color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200", urgent: false },
    { label: "レビュー待ち", value: pendingCount, icon: Clock, color: "text-amber-600", bgColor: "bg-amber-50", borderColor: "border-amber-200", urgent: pendingCount > 0 },
    { label: "修正依頼中", value: revisionCount, icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-50", borderColor: "border-red-200", urgent: false },
    { label: "承認・完了", value: completedCount, icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-50", borderColor: "border-green-200", urgent: false },
  ];

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
        {/* Left: Action Required + Recent */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <h2 className="text-base font-semibold text-gray-900">
                    対応が必要な動画
                  </h2>
                  {actionVideos.length > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                      {actionVideos.length}
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
              {actionVideos.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-green-300 mb-2" />
                  <p className="text-sm text-gray-500">
                    対応が必要な動画はありません
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {actionVideos.map((video) => (
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
                </div>
              )}
            </CardContent>
          </Card>

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
                    const pct = project.total > 0 ? Math.round((project.completed / project.total) * 100) : 0;
                    return (
                      <div key={project.code}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {project.name}
                            </p>
                            <p className="text-xs text-gray-400">{project.code}</p>
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
