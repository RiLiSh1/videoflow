import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/domain/status-badge";
import { VIDEO_STATUS_ORDER } from "@/lib/constants/video-status";
import type { VideoStatus } from "@prisma/client";
import {
  ClipboardList,
  Clock,
  Eye,
  CheckCircle2,
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
    entry.statusCounts[video.status] = (entry.statusCounts[video.status] || 0) + 1;
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
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardContent>
              <div className="flex items-center gap-4 py-2">
                <div className={`rounded-lg p-3 ${card.bgColor}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
            const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

            return (
              <Card key={project.projectCode}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        {project.name}
                      </h3>
                      <p className="text-sm text-gray-500">{project.projectCode}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">
                        {completedCount} / {total} 完了
                      </p>
                      <p className="text-xs text-gray-500">{progressPercent}%</p>
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
