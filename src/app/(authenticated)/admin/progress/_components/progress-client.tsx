"use client";

import { DataTable } from "@/components/ui/data-table";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  VIDEO_STATUS_LABELS,
  VIDEO_STATUS_COLORS,
  VIDEO_STATUS_ORDER,
} from "@/lib/constants/video-status";
import type { VideoStatus } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Film,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import { formatRelative } from "@/lib/utils/format-date";

// ---------- Types ----------

type VideoRow = {
  id: string;
  videoCode: string;
  title: string;
  status: VideoStatus;
  updatedAt: string;
  projectName: string;
  projectCode: string;
  creatorName: string;
  directorName: string | null;
};

type DirectorStat = {
  id: string;
  name: string;
  totalAssigned: number;
  waitingReview: number;
  reviewing: number;
  done: number;
  revisionRequested: number;
  latestUpdate: string | null;
};

type CreatorStat = {
  id: string;
  name: string;
  totalVideos: number;
  draft: number;
  submitted: number;
  inProgress: number;
  completed: number;
  latestUpdate: string | null;
};

type ProjectStat = {
  id: string;
  code: string;
  name: string;
  totalVideos: number;
  completedVideos: number;
  pct: number;
  statusCounts: Partial<Record<VideoStatus, number>>;
};

type SummaryCard = {
  label: string;
  value: number;
  iconKey: string;
  color: string;
  bgColor: string;
  urgent: boolean;
};

type Props = {
  summaryCards: SummaryCard[];
  directorStats: DirectorStat[];
  creatorStats: CreatorStat[];
  videos: VideoRow[];
  projects: ProjectStat[];
};

// ---------- Icons ----------

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Film,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
};

// ---------- Video Table Columns ----------

const videoColumns: ColumnDef<VideoRow, unknown>[] = [
  {
    accessorKey: "videoCode",
    header: "動画コード",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-gray-500">
        {getValue<string>()}
      </span>
    ),
  },
  {
    accessorKey: "title",
    header: "タイトル",
    cell: ({ getValue }) => (
      <span className="font-medium text-gray-900">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: "projectName",
    header: "案件",
    cell: ({ getValue }) => (
      <span className="text-gray-600">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: "creatorName",
    header: "クリエイター",
    cell: ({ getValue }) => (
      <span className="text-gray-600">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: "directorName",
    header: "ディレクター",
    cell: ({ getValue }) => {
      const name = getValue<string | null>();
      return name ? (
        <span className="text-gray-600">{name}</span>
      ) : (
        <span className="text-gray-300">未割当</span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "ステータス",
    cell: ({ getValue }) => {
      const status = getValue<VideoStatus>();
      return (
        <Badge className={VIDEO_STATUS_COLORS[status]}>
          {VIDEO_STATUS_LABELS[status]}
        </Badge>
      );
    },
    sortingFn: (rowA, rowB) => {
      const a = VIDEO_STATUS_ORDER.indexOf(rowA.getValue<VideoStatus>("status"));
      const b = VIDEO_STATUS_ORDER.indexOf(rowB.getValue<VideoStatus>("status"));
      return a - b;
    },
  },
  {
    accessorKey: "updatedAt",
    header: "更新日時",
    cell: ({ getValue }) => (
      <span className="text-xs text-gray-400">
        {formatRelative(getValue<string>())}
      </span>
    ),
  },
];

// ---------- Stat Cell ----------

function StatCell({
  value,
  color,
}: {
  value: number;
  color: string;
}) {
  if (value === 0) return <span className="text-gray-300">0</span>;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${color}`}
    >
      {value}
    </span>
  );
}

// ---------- Component ----------

export function ProgressClient({
  summaryCards,
  directorStats,
  creatorStats,
  videos,
  projects,
}: Props) {
  return (
    <>
      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {summaryCards.map((card) => {
          const Icon = ICON_MAP[card.iconKey] || Film;
          return (
            <Card
              key={card.label}
              className={card.urgent ? "border-2 border-amber-200" : ""}
            >
              <CardContent>
                <div className="flex items-center gap-3 py-2">
                  <div className={`rounded-lg p-2.5 ${card.bgColor}`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
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
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="space-y-6">
        {/* Director + Creator Activity side-by-side on xl */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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
                            <StatCell
                              value={d.waitingReview}
                              color="bg-amber-100 text-amber-700"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatCell
                              value={d.reviewing}
                              color="bg-purple-100 text-purple-700"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatCell
                              value={d.revisionRequested}
                              color="bg-red-100 text-red-700"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatCell
                              value={d.done}
                              color="bg-green-100 text-green-700"
                            />
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

          {/* Creator Activity */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-gray-900">
                クリエイター稼働状況
              </h2>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-3 text-left font-medium text-gray-500">
                        クリエイター
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-gray-500">
                        動画数
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-gray-400" />
                          下書き
                        </span>
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-blue-400" />
                          提出済
                        </span>
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-amber-400" />
                          進行中
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
                    {creatorStats.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-gray-400"
                        >
                          クリエイターが登録されていません
                        </td>
                      </tr>
                    ) : (
                      creatorStats.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {c.name}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-700">
                            {c.totalVideos}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatCell
                              value={c.draft}
                              color="bg-gray-100 text-gray-700"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatCell
                              value={c.submitted}
                              color="bg-blue-100 text-blue-700"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatCell
                              value={c.inProgress}
                              color="bg-amber-100 text-amber-700"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatCell
                              value={c.completed}
                              color="bg-green-100 text-green-700"
                            />
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {c.latestUpdate
                              ? formatRelative(c.latestUpdate)
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
        </div>

        {/* All Videos - Sortable DataTable */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                全動画一覧
              </h2>
              <span className="text-xs text-gray-400">
                {videos.length}件
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              data={videos}
              columns={videoColumns}
              searchPlaceholder="動画コード・タイトル・案件・クリエイター・ディレクターで検索..."
              searchColumn="global"
            />
          </CardContent>
        </Card>

        {/* Project Progress */}
        <div>
          <h2 className="mb-4 text-base font-semibold text-gray-900">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
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
                          {project.completedVideos}/{project.totalVideos} (
                          {project.pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-green-500 transition-all"
                          style={{ width: `${project.pct}%` }}
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
                              <Badge className={VIDEO_STATUS_COLORS[status]}>
                                {VIDEO_STATUS_LABELS[status]}
                              </Badge>
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
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
