"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { VideoStatus } from "@prisma/client";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/domain/status-badge";

type VideoRow = {
  id: string;
  videoCode: string;
  title: string;
  projectName: string;
  directorName: string;
  status: VideoStatus;
  deadline: string;
  updatedAt: string;
  versionsCount: number;
  feedbacksCount: number;
};

const columns: ColumnDef<VideoRow, unknown>[] = [
  {
    accessorKey: "videoCode",
    header: "動画コード",
    cell: ({ row }) => (
      <Link
        href={`/creator/videos/${row.original.id}`}
        className="text-primary-600 hover:text-primary-800 font-medium hover:underline"
      >
        {row.original.videoCode}
      </Link>
    ),
  },
  {
    accessorKey: "title",
    header: "タイトル",
    cell: ({ row }) => (
      <Link
        href={`/creator/videos/${row.original.id}`}
        className="text-gray-900 hover:text-primary-600 hover:underline"
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    accessorKey: "projectName",
    header: "案件",
  },
  {
    accessorKey: "directorName",
    header: "ディレクター",
  },
  {
    accessorKey: "status",
    header: "ステータス",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "deadline",
    header: "締切日",
  },
  {
    accessorKey: "updatedAt",
    header: "最終更新",
  },
];

interface VideosTableProps {
  videos: VideoRow[];
}

export function VideosTable({ videos }: VideosTableProps) {
  return (
    <DataTable
      data={videos}
      columns={columns}
      searchPlaceholder="タイトルで検索..."
      searchColumn="title"
    />
  );
}
