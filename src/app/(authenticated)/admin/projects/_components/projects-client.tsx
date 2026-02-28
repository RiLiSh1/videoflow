"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import type { ProjectStatus } from "@prisma/client";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format-date";
import { Plus, Archive } from "lucide-react";
import { ProjectCreateDialog } from "./project-create-dialog";
import { Dialog } from "@/components/ui/dialog";

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: "進行中",
  COMPLETED: "完了",
  ARCHIVED: "アーカイブ",
};

const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  ARCHIVED: "bg-gray-100 text-gray-800",
};

interface DirectorInfo {
  id: string;
  name: string;
}

export interface ProjectRow {
  id: string;
  projectCode: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdAt: string;
  creator: { id: string; name: string };
  directors: { user: DirectorInfo }[];
  _count: { videos: number };
}

interface ProjectsClientProps {
  projects: ProjectRow[];
  availableDirectors: DirectorInfo[];
}

export function ProjectsClient({
  projects,
  availableDirectors,
}: ProjectsClientProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [archiveProject, setArchiveProject] = useState<ProjectRow | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState("");

  const handleArchive = async () => {
    if (!archiveProject) return;
    setArchiving(true);
    setArchiveError("");
    try {
      const res = await fetch(`/api/projects/${archiveProject.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) {
        setArchiveError(json.error || "アーカイブに失敗しました");
        setArchiving(false);
        return;
      }
      setArchiveProject(null);
      router.refresh();
    } catch {
      setArchiveError("アーカイブに失敗しました");
    } finally {
      setArchiving(false);
    }
  };

  const columns: ColumnDef<ProjectRow, unknown>[] = [
    {
      accessorKey: "projectCode",
      header: "案件コード",
      cell: ({ row }) => (
        <span className="font-medium text-gray-900">
          {row.original.projectCode}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "案件名",
    },
    {
      accessorKey: "status",
      header: "ステータス",
      cell: ({ row }) => (
        <Badge className={PROJECT_STATUS_COLORS[row.original.status]}>
          {PROJECT_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      id: "directors",
      header: "ディレクター",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.directors.map((d) => (
            <span
              key={d.user.id}
              className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
            >
              {d.user.name}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: "videoCount",
      header: "動画数",
      cell: ({ row }) => (
        <span className="text-gray-700">{row.original._count.videos}</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "作成日",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: "actions",
      header: "操作",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.status !== "ARCHIVED" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setArchiveProject(row.original)}
              title="アーカイブ"
            >
              <Archive className="h-4 w-4 text-gray-500" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const handleSuccess = () => {
    router.refresh();
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新規案件
        </Button>
      </div>

      <DataTable
        data={projects}
        columns={columns}
        searchPlaceholder="案件コード、案件名で検索..."
        searchColumn="name"
      />

      <ProjectCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={handleSuccess}
        directors={availableDirectors}
      />

      {archiveProject && (
        <Dialog
          open={!!archiveProject}
          onClose={() => {
            setArchiveProject(null);
            setArchiveError("");
          }}
          title="案件のアーカイブ"
        >
          <div className="space-y-4">
            {archiveError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {archiveError}
              </div>
            )}
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{archiveProject.name}</span>
              （{archiveProject.projectCode}）をアーカイブしますか？
            </p>
            <p className="text-sm text-gray-500">
              アーカイブされた案件は一覧に表示されなくなりますが、データは保持されます。
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setArchiveProject(null);
                  setArchiveError("");
                }}
              >
                キャンセル
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={archiving}
                onClick={handleArchive}
              >
                アーカイブする
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
