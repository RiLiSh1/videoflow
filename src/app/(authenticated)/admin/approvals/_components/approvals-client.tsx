"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import type { VideoStatus } from "@prisma/client";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/domain/status-badge";
import { formatDateTime } from "@/lib/utils/format-date";
import { Dialog } from "@/components/ui/dialog";
import { CheckCircle, XCircle, ArrowRightCircle } from "lucide-react";

export interface ApprovalVideoRow {
  id: string;
  videoCode: string;
  title: string;
  status: VideoStatus;
  updatedAt: string;
  project: { projectCode: string; name: string };
  creator: { name: string };
  director: { name: string } | null;
}

interface ApprovalsClientProps {
  videos: ApprovalVideoRow[];
}

type ActionType = "approve" | "revision" | "complete";

interface PendingAction {
  video: ApprovalVideoRow;
  type: ActionType;
}

function getTargetStatus(
  currentStatus: VideoStatus,
  action: ActionType
): VideoStatus | null {
  if (action === "approve") {
    if (currentStatus === "SUBMITTED") return "IN_REVIEW";
    return null;
  }
  if (action === "revision") {
    if (currentStatus === "SUBMITTED") return "IN_REVIEW";
    if (currentStatus === "FINAL_REVIEW") return "REVISION_REQUESTED";
    return null;
  }
  if (action === "complete") {
    if (currentStatus === "FINAL_REVIEW") return "COMPLETED";
    return null;
  }
  return null;
}

function getActionLabel(action: ActionType): string {
  switch (action) {
    case "approve":
      return "レビュー開始";
    case "revision":
      return "修正依頼";
    case "complete":
      return "完了にする";
  }
}

export function ApprovalsClient({ videos }: ApprovalsClientProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAction = async () => {
    if (!pendingAction) return;
    const targetStatus = getTargetStatus(
      pendingAction.video.status,
      pendingAction.type
    );
    if (!targetStatus) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/videos/${pendingAction.video.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: targetStatus }),
        }
      );
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "ステータスの更新に失敗しました");
        setLoading(false);
        return;
      }
      setPendingAction(null);
      router.refresh();
    } catch {
      setError("ステータスの更新に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnDef<ApprovalVideoRow, unknown>[] = [
    {
      accessorKey: "videoCode",
      header: "動画コード",
      cell: ({ row }) => (
        <span className="font-medium text-gray-900">
          {row.original.videoCode}
        </span>
      ),
    },
    {
      accessorKey: "title",
      header: "タイトル",
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
      cell: ({ row }) => row.original.creator.name,
    },
    {
      id: "director",
      header: "ディレクター",
      cell: ({ row }) => row.original.director?.name || "-",
    },
    {
      accessorKey: "status",
      header: "ステータス",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "updatedAt",
      header: "提出日時",
      cell: ({ row }) => formatDateTime(row.original.updatedAt),
    },
    {
      id: "actions",
      header: "操作",
      enableSorting: false,
      cell: ({ row }) => {
        const video = row.original;
        return (
          <div className="flex items-center gap-1">
            {video.status === "SUBMITTED" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setPendingAction({ video, type: "approve" })
                }
                title="レビュー開始"
              >
                <ArrowRightCircle className="h-4 w-4 text-blue-600" />
              </Button>
            )}
            {video.status === "FINAL_REVIEW" && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setPendingAction({ video, type: "complete" })
                  }
                  title="完了にする"
                >
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setPendingAction({ video, type: "revision" })
                  }
                  title="修正依頼"
                >
                  <XCircle className="h-4 w-4 text-red-500" />
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      {videos.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">承認待ちの動画はありません</p>
        </div>
      ) : (
        <DataTable
          data={videos}
          columns={columns}
          searchPlaceholder="動画コード、タイトルで検索..."
          searchColumn="title"
        />
      )}

      {pendingAction && (
        <Dialog
          open={!!pendingAction}
          onClose={() => {
            setPendingAction(null);
            setError("");
          }}
          title="ステータス変更の確認"
        >
          <div className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <p className="text-sm text-gray-700">
              <span className="font-semibold">
                {pendingAction.video.title}
              </span>
              （{pendingAction.video.videoCode}）を
              <span className="font-semibold">
                {getActionLabel(pendingAction.type)}
              </span>
              しますか？
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPendingAction(null);
                  setError("");
                }}
              >
                キャンセル
              </Button>
              <Button
                type="button"
                variant={
                  pendingAction.type === "revision" ? "danger" : "primary"
                }
                loading={loading}
                onClick={handleAction}
              >
                {getActionLabel(pendingAction.type)}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
