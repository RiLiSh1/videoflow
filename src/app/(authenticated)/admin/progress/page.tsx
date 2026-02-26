import { prisma } from "@/lib/db";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/domain/status-badge";
import { VIDEO_STATUS_ORDER } from "@/lib/constants/video-status";
import { formatRelative } from "@/lib/utils/format-date";
import type { VideoStatus } from "@prisma/client";
import {
  Film,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
} from "lucide-react";

async function getProgressData() {
  const [videos, directors] = await Promise.all([
    prisma.video.findMany({
      include: {
        project: { select: { id: true, projectCode: true, name: true } },
        creator: { select: { id: true, name: true } },
        director: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: "DIRECTOR", isActive: true },
      select: {
        id: true,
        name: true,
        directedVideos: {
          select: { id: true, status: true, updatedAt: true },
        },
      },
    }),
  ]);

  return { videos, directors };
}

export default async function AdminProgressPage() {
  const { videos, directors } = await getProgressData();

  // Summary
  const total = videos.length;
  const pendingReview = videos.filter((v) =>
    ["SUBMITTED", "REVISED"].includes(v.status)
  ).length;
  const inReview = videos.filter((v) =>
    ["IN_REVIEW", "REVISION_REQUESTED"].includes(v.status)
  ).length;
  const awaitingAdmin = videos.filter(
    (v) => v.status === "FINAL_REVIEW"
  ).length;
  const completed = videos.filter((v) => v.status === "COMPLETED").length;

  // Group by project
  const projectMap = new Map<
    string,
    {
      id: string;
      code: string;
      name: string;
      videos: typeof videos;
      statusCounts: Partial<Record<VideoStatus, number>>;
    }
  >();
  for (const video of videos) {
    const key = video.project.id;
    if (!projectMap.has(key)) {
      projectMap.set(key, {
        id: video.project.id,
        code: video.project.projectCode,
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
    a.code.localeCompare(b.code)
  );

  // Director activity
  const directorStats = directors.map((d) => {
    const vids = d.directedVideos;
    const totalAssigned = vids.length;
    const waitingReview = vids.filter((v) =>
      ["SUBMITTED", "REVISED"].includes(v.status)
    ).length;
    const reviewing = vids.filter((v) =>
      ["IN_REVIEW"].includes(v.status)
    ).length;
    const done = vids.filter((v) =>
      ["COMPLETED", "FINAL_REVIEW", "APPROVED"].includes(v.status)
    ).length;
    const revisionRequested = vids.filter(
      (v) => v.status === "REVISION_REQUESTED"
    ).length;
    // Latest activity
    const latestUpdate =
      vids.length > 0
        ? vids.reduce((latest, v) =>
            v.updatedAt > latest.updatedAt ? v : latest
          ).updatedAt
        : null;
    return {
      id: d.id,
      name: d.name,
      totalAssigned,
      waitingReview,
      reviewing,
      done,
      revisionRequested,
      latestUpdate,
    };
  });

  const summaryCards = [
    {
      label: "総動画数",
      value: total,
      icon: Film,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "レビュー待ち",
      value: pendingReview,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      urgent: pendingReview > 0,
    },
    {
      label: "レビュー中",
      value: inReview,
      icon: AlertTriangle,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      urgent: false,
    },
    {
      label: "最終確認待ち",
      value: awaitingAdmin,
      icon: UserCheck,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      urgent: awaitingAdmin > 0,
    },
    {
      label: "完了",
      value: completed,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
      urgent: false,
    },
  ];

  return (
    <PageContainer title="進捗管理">
      {/* Summary */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {summaryCards.map((card) => (
          <Card
            key={card.label}
            className={
              card.urgent ? "border-2 border-amber-200" : ""
            }
          >
            <CardContent>
              <div className="flex items-center gap-3 py-2">
                <div className={`rounded-lg p-2.5 ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    {card.label}
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {card.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left: Projects + All Videos */}
        <div className="xl:col-span-2 space-y-6">
          {/* Director Activity */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-gray-900">
                ディレクター稼働状況
              </h2>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-3 text-left font-medium text-gray-500">
                        ディレクター
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-gray-500">
                        担当数
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-amber-400" />
                          待ち
                        </span>
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-purple-400" />
                          対応中
                        </span>
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-red-400" />
                          差し戻し
                        </span>
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-green-400" />
                          完了
                        </span>
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">
                        最終更新
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {directorStats.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-gray-400"
                        >
                          ディレクターが登録されていません
                        </td>
                      </tr>
                    ) : (
                      directorStats.map((d) => (
                        <tr key={d.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {d.name}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-700">
                            {d.totalAssigned}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {d.waitingReview > 0 ? (
                              <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                                {d.waitingReview}
                              </span>
                            ) : (
                              <span className="text-gray-300">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {d.reviewing > 0 ? (
                              <span className="inline-flex items-center justify-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700">
                                {d.reviewing}
                              </span>
                            ) : (
                              <span className="text-gray-300">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {d.revisionRequested > 0 ? (
                              <span className="inline-flex items-center justify-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                                {d.revisionRequested}
                              </span>
                            ) : (
                              <span className="text-gray-300">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {d.done > 0 ? (
                              <span className="inline-flex items-center justify-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                                {d.done}
                              </span>
                            ) : (
                              <span className="text-gray-300">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {d.latestUpdate
                              ? formatRelative(d.latestUpdate)
                              : "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* All Videos Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">
                  全動画一覧
                </h2>
                <span className="text-xs text-gray-400">{total}件</span>
              </div>
            </CardHeader>
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
                        ディレクター
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">
                        ステータス
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">
                        更新日時
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {videos.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-gray-400"
                        >
                          動画がまだありません
                        </td>
                      </tr>
                    ) : (
                      videos.map((video) => (
                        <tr
                          key={video.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">
                            {video.videoCode}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {video.title}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {video.project.name}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {video.creator.name}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {video.director?.name || (
                              <span className="text-gray-300">未割当</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={video.status} />
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {formatRelative(video.updatedAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Project Progress */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">
            案件別進捗
          </h2>
          {projects.length === 0 ? (
            <Card>
              <CardContent>
                <p className="py-4 text-center text-sm text-gray-400">
                  案件がまだありません
                </p>
              </CardContent>
            </Card>
          ) : (
            projects.map((project) => {
              const totalVids = project.videos.length;
              const completedVids =
                (project.statusCounts["COMPLETED"] || 0) +
                (project.statusCounts["FINAL_REVIEW"] || 0);
              const pct =
                totalVids > 0
                  ? Math.round((completedVids / totalVids) * 100)
                  : 0;

              return (
                <Card key={project.id}>
                  <CardContent>
                    <div className="space-y-3 py-1">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {project.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {project.code}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-gray-600 flex-shrink-0 ml-2">
                          {completedVids}/{totalVids} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-green-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {VIDEO_STATUS_ORDER.map((status) => {
                          const count = project.statusCounts[status];
                          if (!count) return null;
                          return (
                            <div
                              key={status}
                              className="flex items-center gap-1"
                            >
                              <StatusBadge status={status} />
                              <span className="text-xs font-medium text-gray-600">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </PageContainer>
  );
}
