"use client";

import { useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { VideoStatus } from "@prisma/client";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/domain/status-badge";
import { VIDEO_STATUS_LABELS } from "@/lib/constants/video-status";
import { formatRelative } from "@/lib/utils/format-date";
import { Button } from "@/components/ui/button";
import { CheckSquare, ExternalLink } from "lucide-react";

interface ReviewVideoRow {
  id: string;
  videoCode: string;
  title: string;
  status: VideoStatus;
  updatedAt: string;
  project: { projectCode: string; name: string };
  creator: { name: string };
  director: { name: string } | null;
}

type FilterTab = "ALL" | VideoStatus;

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "ALL", label: "全て" },
  { value: "SUBMITTED", label: VIDEO_STATUS_LABELS.SUBMITTED },
  { value: "IN_REVIEW", label: VIDEO_STATUS_LABELS.IN_REVIEW },
  { value: "REVISION_REQUESTED", label: VIDEO_STATUS_LABELS.REVISION_REQUESTED },
  { value: "REVISED", label: VIDEO_STATUS_LABELS.REVISED },
  { value: "FINAL_REVIEW", label: VIDEO_STATUS_LABELS.FINAL_REVIEW },
];

const columns: ColumnDef<ReviewVideoRow, unknown>[] = [
  {
    accessorKey: "videoCode",
    header: "動画コード",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-gray-600">
        {row.original.videoCode}
      </span>
    ),
  },
  {
    accessorKey: "title",
    header: "タイトル",
    cell: ({ row }) => (
      <Link
        href={`/admin/approvals/${row.original.id}`}
        className="font-medium text-primary-600 hover:text-primary-800 hover:underline"
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    id: "project",
    header: "案件",
    cell: ({ row }) => (
      <span className="text-gray-700">{row.original.project.name}</span>
    ),
  },
  {
    id: "creator",
    header: "クリエイター",
    cell: ({ row }) => (
      <span className="text-gray-600">{row.original.creator.name}</span>
    ),
  },
  {
    id: "director",
    header: "ディレクター",
    cell: ({ row }) => (
      <span className="text-gray-600">
        {row.original.director?.name || "-"}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "ステータス",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "updatedAt",
    header: "更新日時",
    cell: ({ row }) => (
      <span className="text-xs text-gray-500">
        {formatRelative(row.original.updatedAt)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "操作",
    enableSorting: false,
    cell: ({ row }) => (
      <Link href={`/admin/approvals/${row.original.id}`}>
        <Button variant="secondary" size="sm">
          <ExternalLink className="mr-1 h-3.5 w-3.5" />
          詳細
        </Button>
      </Link>
    ),
  },
];

export function AdminReviewsTable({ videos }: { videos: ReviewVideoRow[] }) {
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");

  const filteredVideos =
    activeTab === "ALL"
      ? videos
      : videos.filter((v) => v.status === activeTab);

  return (
    <>
      {/* Status Filter Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => {
          const count =
            tab.value === "ALL"
              ? videos.length
              : videos.filter((v) => v.status === tab.value).length;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? "bg-primary-100 text-primary-800"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
              <span
                className={`text-xs ${
                  activeTab === tab.value
                    ? "text-primary-600"
                    : "text-gray-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filteredVideos.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white py-12 text-center">
          <CheckSquare className="mx-auto h-10 w-10 text-gray-300 mb-2" />
          <p className="text-gray-500">
            {activeTab === "ALL"
              ? "レビュー中の動画はありません"
              : `${FILTER_TABS.find((t) => t.value === activeTab)?.label}の動画はありません`}
          </p>
        </div>
      ) : (
        <DataTable
          data={filteredVideos}
          columns={columns}
          searchPlaceholder="動画コード、タイトルで検索..."
          searchColumn="title"
        />
      )}
    </>
  );
}
