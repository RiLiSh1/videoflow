"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { VideoStatus } from "@prisma/client";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatRelative } from "@/lib/utils/format-date";
import { cn } from "@/lib/utils/cn";
import { Eye } from "lucide-react";

interface VideoRow {
  id: string;
  videoCode: string;
  title: string;
  status: VideoStatus;
  updatedAt: string;
  project: {
    id: string;
    projectCode: string;
    name: string;
  };
  creator: {
    id: string;
    name: string;
  };
}

interface ReviewsTableProps {
  videos: VideoRow[];
}

type StatusFilter = "ALL" | VideoStatus;

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "すべて" },
  { value: "SUBMITTED", label: "提出済み" },
  { value: "IN_REVIEW", label: "レビュー中" },
  { value: "REVISION_REQUESTED", label: "修正依頼" },
  { value: "REVISED", label: "修正済み" },
  { value: "APPROVED", label: "承認済み" },
  { value: "FINAL_REVIEW", label: "最終確認" },
  { value: "COMPLETED", label: "完了" },
];

const columns: ColumnDef<VideoRow, unknown>[] = [
  {
    accessorKey: "videoCode",
    header: "動画コード",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-gray-600">{row.original.videoCode}</span>
    ),
  },
  {
    accessorKey: "title",
    header: "タイトル",
    cell: ({ row }) => (
      <Link
        href={`/director/reviews/${row.original.id}`}
        className="font-medium text-primary-600 hover:text-primary-800 hover:underline"
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    accessorKey: "project.name",
    header: "案件",
    cell: ({ row }) => (
      <span className="text-gray-700">{row.original.project.name}</span>
    ),
  },
  {
    accessorKey: "creator.name",
    header: "クリエイター",
    cell: ({ row }) => (
      <span className="text-gray-700">{row.original.creator.name}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "ステータス",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "deadline",
    header: "納期",
    cell: ({ row }) => {
      if (!row.original.deadline) return <span className="text-gray-400">-</span>;
      const deadlineDate = new Date(row.original.deadline);
      const isOverdue = deadlineDate < new Date();
      return (
        <span className={cn("text-sm", isOverdue ? "text-red-600 font-medium" : "text-gray-700")}>
          {formatDate(row.original.deadline)}
        </span>
      );
    },
  },
  {
    accessorKey: "updatedAt",
    header: "更新日時",
    cell: ({ row }) => (
      <span className="text-gray-500 text-xs">{formatRelative(row.original.updatedAt)}</span>
    ),
  },
  {
    id: "actions",
    header: "",
    enableSorting: false,
    cell: ({ row }) => {
      const status = row.original.status;
      const isActionable = ["SUBMITTED", "REVISED"].includes(status);
      return (
        <Link href={`/director/reviews/${row.original.id}`}>
          <Button variant={isActionable ? "primary" : "ghost"} size="sm">
            <Eye className="mr-1 h-4 w-4" />
            {isActionable ? "レビュー開始" : "詳細"}
          </Button>
        </Link>
      );
    },
  },
];

export function ReviewsTable({ videos }: ReviewsTableProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const filteredVideos = useMemo(() => {
    if (statusFilter === "ALL") return videos;
    return videos.filter((v) => v.status === statusFilter);
  }, [videos, statusFilter]);

  // Count by status for filter badges
  const statusCounts = useMemo(() => {
    const counts: Partial<Record<StatusFilter, number>> = { ALL: videos.length };
    for (const v of videos) {
      counts[v.status] = (counts[v.status] || 0) + 1;
    }
    return counts;
  }, [videos]);

  return (
    <div className="space-y-4">
      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTER_OPTIONS.map((opt) => {
          const count = statusCounts[opt.value] || 0;
          if (opt.value !== "ALL" && count === 0) return null;
          return (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                statusFilter === opt.value
                  ? "bg-primary-100 text-primary-800"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {opt.label}
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs",
                  statusFilter === opt.value
                    ? "bg-primary-200 text-primary-900"
                    : "bg-gray-200 text-gray-700"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <DataTable
        data={filteredVideos}
        columns={columns}
        searchPlaceholder="タイトルで検索..."
        searchColumn="title"
      />
    </div>
  );
}
