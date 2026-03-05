import { prisma } from "@/lib/db";
import { PageContainer } from "@/components/layout/page-container";

export const revalidate = 30;
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/domain/status-badge";
import { VIDEO_STATUS_ORDER } from "@/lib/constants/video-status";
import { formatDateTime } from "@/lib/utils/format-date";
import type { VideoStatus } from "@prisma/client";
import { Users, FolderOpen, Film, Clock } from "lucide-react";

async function getDashboardData() {
  const [
    activeUsers,
    activeProjects,
    totalVideos,
    pendingApprovals,
    statusCounts,
    recentVideos,
  ] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.project.count({ where: { status: "ACTIVE" } }),
    prisma.video.count(),
    prisma.video.count({
      where: { status: { in: ["SUBMITTED", "FINAL_REVIEW"] } },
    }),
    prisma.video.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.video.findMany({
      take: 10,
      orderBy: { updatedAt: "desc" },
      include: {
        project: { select: { projectCode: true, name: true } },
        creator: { select: { name: true } },
        director: { select: { name: true } },
      },
    }),
  ]);

  const statusBreakdown: Record<string, number> = {};
  for (const s of statusCounts) {
    statusBreakdown[s.status] = s._count.status;
  }

  return {
    activeUsers,
    activeProjects,
    totalVideos,
    pendingApprovals,
    statusBreakdown,
    recentVideos,
  };
}

export default async function AdminDashboardPage() {
  const data = await getDashboardData();

  const statCards = [
    {
      label: "アクティブユーザー",
      value: data.activeUsers,
      icon: Users,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "進行中の案件",
      value: data.activeProjects,
      icon: FolderOpen,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "総動画数",
      value: data.totalVideos,
      icon: Film,
      color: "text-violet-600 bg-violet-50",
    },
    {
      label: "承認待ち",
      value: data.pendingApprovals,
      icon: Clock,
      color: "text-amber-600 bg-amber-50",
    },
  ];

  return (
    <PageContainer title="ダッシュボード">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg p-3 ${card.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{card.label}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {card.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Status Breakdown */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              ステータス別動画数
            </h2>
          </div>
          <CardContent>
            <div className="space-y-3">
              {VIDEO_STATUS_ORDER.map((status) => {
                const count = data.statusBreakdown[status] || 0;
                return (
                  <div
                    key={status}
                    className="flex items-center justify-between"
                  >
                    <StatusBadge status={status as VideoStatus} />
                    <span className="text-sm font-medium text-gray-700">
                      {count} 件
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Videos */}
        <div className="lg:col-span-2">
          <Card>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                最近更新された動画
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      動画コード
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      タイトル
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      案件
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      ステータス
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      更新日時
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {data.recentVideos.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        動画がありません
                      </td>
                    </tr>
                  ) : (
                    data.recentVideos.map((video) => (
                      <tr
                        key={video.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {video.videoCode}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                          {video.title}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {video.project.name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={video.status} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {formatDateTime(video.updatedAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
