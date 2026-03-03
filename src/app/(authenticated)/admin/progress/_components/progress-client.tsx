"use client";

import { DataTable } from "@/components/ui/data-table";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/domain/status-badge";
import { VIDEO_STATUS_ORDER } from "@/lib/constants/video-status";
import type { VideoStatus } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Film,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import { formatDate, formatRelative } from "@/lib/utils/format-date";

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
  firstUploadDate: string | null;
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

// ---------- 5-Checkpoint Pipeline ----------
//
// The pipeline represents the video workflow as 5 checkpoints:
//   1. 初稿提出   (Creator submits)
//   2. 確認・修正  (Review/revision cycle)
//   3. ディレクター承認 (Director approves)
//   4. 管理者承認  (Admin approves)
//   5. 完了       (Done)
//
// Each checkpoint is: green (passed), red (active/attention), gray (not reached)

type CheckpointColor = "green" | "red" | "gray";

const PIPELINE_CHECKPOINTS = [
  { label: "初稿提出", role: "クリエイター" },
  { label: "確認・修正", role: "クリエイター" },
  { label: "ディレクター承認", role: "ディレクター" },
  { label: "管理者承認", role: "管理者" },
  { label: "完了", role: "" },
] as const;

function getCheckpointColors(status: VideoStatus): CheckpointColor[] {
  switch (status) {
    case "DRAFT":
      return ["red", "gray", "gray", "gray", "gray"];
    case "SUBMITTED":
      return ["green", "red", "gray", "gray", "gray"];
    case "IN_REVIEW":
      return ["green", "green", "red", "gray", "gray"];
    case "REVISION_REQUESTED":
      return ["green", "red", "red", "gray", "gray"];
    case "REVISED":
      return ["green", "green", "red", "gray", "gray"];
    case "APPROVED":
      return ["green", "green", "green", "gray", "gray"];
    case "FINAL_REVIEW":
      return ["green", "green", "green", "red", "gray"];
    case "COMPLETED":
      return ["green", "green", "green", "green", "green"];
  }
}

const COLOR_CLASSES: Record<CheckpointColor, { bar: string; dot: string }> = {
  green: { bar: "bg-green-500", dot: "bg-green-500 border-green-500" },
  red: { bar: "bg-red-400 animate-pulse", dot: "bg-red-400 border-red-400 animate-pulse" },
  gray: { bar: "bg-gray-200", dot: "bg-white border-gray-300" },
};

// ---------- Compact Pipeline (for table cells) ----------

function PipelineCompact({ status }: { status: VideoStatus }) {
  const colors = getCheckpointColors(status);

  return (
    <div className="min-w-[150px] space-y-1">
      <StatusBadge status={status} />
      {/* 5 segment bar */}
      <div className="flex gap-0.5">
        {colors.map((color, i) => (
          <div key={i} className="group relative flex-1">
            <div
              className={`h-1.5 rounded-full ${COLOR_CLASSES[color].bar} transition-all`}
            />
            <div className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
              {PIPELINE_CHECKPOINTS[i].label}
            </div>
          </div>
        ))}
      </div>
      {/* Endpoints */}
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>初稿</span>
        <span>完了</span>
      </div>
    </div>
  );
}

// ---------- Workflow Overview ----------

function WorkflowOverview({ videos }: { videos: VideoRow[] }) {
  const total = videos.length;
  if (total === 0) {
    return (
      <p className="text-center text-sm text-gray-400">動画がありません</p>
    );
  }

  // Count how many videos are at each checkpoint as their "active" step
  const checkpointCounts = PIPELINE_CHECKPOINTS.map((_, cpIndex) => {
    return videos.filter((v) => {
      const colors = getCheckpointColors(v.status);
      // Find which checkpoint is RED (active)
      const activeIndex = colors.indexOf("red");
      // If no red (all green = completed), assign to last checkpoint
      return activeIndex === -1 ? cpIndex === 4 : activeIndex === cpIndex;
    }).length;
  });

  const completedCount = videos.filter((v) => v.status === "COMPLETED").length;

  return (
    <div className="space-y-6">
      {/* Large pipeline with counts */}
      <div className="flex items-start">
        {PIPELINE_CHECKPOINTS.map((cp, i) => {
          const count = checkpointCounts[i];
          const isLast = i === PIPELINE_CHECKPOINTS.length - 1;
          const hasVideos = count > 0;

          return (
            <div key={cp.label} className="flex flex-1 items-start">
              <div className="flex flex-col items-center flex-1">
                {/* Role */}
                <span className="mb-1 text-[10px] font-medium text-gray-400">
                  {cp.role || "\u00A0"}
                </span>
                {/* Connector + Circle */}
                <div className="flex w-full items-center">
                  {i > 0 && <div className="h-0.5 flex-1 bg-gray-200" />}
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all ${
                      hasVideos && isLast
                        ? "bg-green-500 text-white"
                        : hasVideos
                          ? "bg-red-100 text-red-700 ring-2 ring-red-300"
                          : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {count}
                  </div>
                  {!isLast && <div className="h-0.5 flex-1 bg-gray-200" />}
                </div>
                {/* Label */}
                <span
                  className={`mt-1.5 text-center text-xs font-medium ${
                    hasVideos && isLast
                      ? "text-green-700"
                      : hasVideos
                        ? "text-red-600"
                        : "text-gray-400"
                  }`}
                >
                  {cp.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar: completed vs total */}
      <div>
        <div className="mb-1 flex justify-between text-xs text-gray-500">
          <span>全体進捗</span>
          <span className="font-medium">
            {completedCount}/{total} 完了 (
            {Math.round((completedCount / total) * 100)}%)
          </span>
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="rounded-full bg-green-500 transition-all"
            style={{ width: `${(completedCount / total) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

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
    accessorKey: "firstUploadDate",
    header: "初回アップロード日",
    cell: ({ getValue }) => {
      const date = getValue<string | null>();
      return date ? (
        <span className="text-xs text-gray-600">{formatDate(date)}</span>
      ) : (
        <span className="text-xs text-gray-300">未提出</span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "進捗",
    cell: ({ getValue }) => {
      const status = getValue<VideoStatus>();
      return <PipelineCompact status={status} />;
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

// ---------- Project Pipeline Summary ----------

function ProjectPipelineSummary({
  statusCounts,
  totalVideos,
}: {
  statusCounts: Partial<Record<VideoStatus, number>>;
  totalVideos: number;
}) {
  if (totalVideos === 0) return null;

  // Build a virtual list of videos by status to compute checkpoint counts
  const checkpointCounts = PIPELINE_CHECKPOINTS.map((_, cpIndex) => {
    let count = 0;
    for (const [status, cnt] of Object.entries(statusCounts)) {
      if (!cnt) continue;
      const colors = getCheckpointColors(status as VideoStatus);
      const activeIndex = colors.indexOf("red");
      if (activeIndex === -1 ? cpIndex === 4 : activeIndex === cpIndex) {
        count += cnt;
      }
    }
    return count;
  });

  return (
    <div className="space-y-2">
      {/* Mini pipeline */}
      <div className="flex items-center gap-0.5">
        {PIPELINE_CHECKPOINTS.map((cp, i) => {
          const count = checkpointCounts[i];
          const isLast = i === PIPELINE_CHECKPOINTS.length - 1;
          return (
            <div key={cp.label} className="group relative flex-1">
              <div
                className={`flex h-6 items-center justify-center rounded text-[10px] font-bold transition-all ${
                  count > 0 && isLast
                    ? "bg-green-500 text-white"
                    : count > 0
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {count > 0 ? count : ""}
              </div>
              <div className="pointer-events-none absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                {cp.label}: {count}件
              </div>
            </div>
          );
        })}
      </div>
      {/* Labels */}
      <div className="flex gap-0.5 text-[10px] text-gray-400">
        <span className="flex-1 text-center">初稿</span>
        <span className="flex-1 text-center">確認</span>
        <span className="flex-1 text-center">Dir</span>
        <span className="flex-1 text-center">管理</span>
        <span className="flex-1 text-center">完了</span>
      </div>
    </div>
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

      {/* Workflow Pipeline Overview */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900">
            ワークフローパイプライン
          </h2>
        </CardHeader>
        <CardContent>
          <WorkflowOverview videos={videos} />
        </CardContent>
      </Card>

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
                      {/* Pipeline summary for this project */}
                      <ProjectPipelineSummary
                        statusCounts={project.statusCounts}
                        totalVideos={project.totalVideos}
                      />
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
