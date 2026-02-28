"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { VideoStatus } from "@prisma/client";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/domain/status-badge";
import { formatRelative } from "@/lib/utils/format-date";
import { Button } from "@/components/ui/button";
import { CircleCheckBig, ExternalLink } from "lucide-react";

interface CompletedVideoRow {
  id: string;
  videoCode: string;
  title: string;
  status: VideoStatus;
  updatedAt: string;
  project: { projectCode: string; name: string };
  creator: { name: string };
  director: { name: string } | null;
}

const columns: ColumnDef<CompletedVideoRow, unknown>[] = [
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
    header: "完了日時",
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

export function CompletedTable({
  videos,
}: {
  videos: CompletedVideoRow[];
}) {
  return videos.length === 0 ? (
    <div className="rounded-lg border border-gray-200 bg-white py-12 text-center">
      <CircleCheckBig className="mx-auto h-10 w-10 text-gray-300 mb-2" />
      <p className="text-gray-500">完了した動画はありません</p>
    </div>
  ) : (
    <DataTable
      data={videos}
      columns={columns}
      searchPlaceholder="動画コード、タイトルで検索..."
      searchColumn="title"
    />
  );
}
