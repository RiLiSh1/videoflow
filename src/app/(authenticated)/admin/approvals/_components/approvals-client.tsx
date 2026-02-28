"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { VideoStatus } from "@prisma/client";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/domain/status-badge";
import { VIDEO_STATUS_LABELS } from "@/lib/constants/video-status";
import { formatRelative } from "@/lib/utils/format-date";
import { Dialog } from "@/components/ui/dialog";
import { CheckCircle2, RotateCcw, ExternalLink } from "lucide-react";

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

type ActionType = "complete" | "revision";

interface PendingAction {
  video: ApprovalVideoRow;
  type: ActionType;
}

function getTargetStatus(action: ActionType): VideoStatus {
  return action === "complete" ? "COMPLETED" : "REVISION_REQUESTED";
}

function getActionLabel(action: ActionType): string {
  return action === "complete" ? "最終承認" : "差し戻し";
}

type FilterTab = "ALL" | VideoStatus;

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "ALL", label: "全て" },
  { value: "SUBMITTED", label: VIDEO_STATUS_LABELS.SUBMITTED },
  { value: "IN_REVIEW", label: VIDEO_STATUS_LABELS.IN_REVIEW },
  { value: "REVISION_REQUESTED", label: VIDEO_STATUS_LABELS.REVISION_REQUESTED },
  { value: "REVISED", label: VIDEO_STATUS_LABELS.REVISED },
  { value: "FINAL_REVIEW", label: VIDEO_STATUS_LABELS.FINAL_REVIEW },
  { value: "COMPLETED", label: VIDEO_STATUS_LABELS.COMPLETED },
];

export function ApprovalsClient({ videos }: ApprovalsClientProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");

  const filteredVideos =
    activeTab === "ALL"
      ? videos
      : videos.filter((v) => v.status === activeTab);

  const handleAction = async () => {
    if (!pendingAction) return;
    const targetStatus = getTargetStatus(pendingAction.type);

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
      cell: ({ row }) => {
        const video = row.original;
        return (
          <div className="flex items-center gap-2">
            {video.status === "FINAL_REVIEW" && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    setPendingAction({ video, type: "complete" })
                  }
                >
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  承認
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    setPendingAction({ video, type: "revision" })
                  }
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  差し戻し
                </Button>
              </>
            )}
            <Link href={`/admin/approvals/${video.id}`}>
              <Button variant="secondary" size="sm">
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                詳細
              </Button>
            </Link>
          </div>
        );
      },
    },
  ];

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
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-300 mb-2" />
          <p className="text-gray-500">
            {activeTab === "ALL"
              ? "動画はありません"
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

      {pendingAction && (
        <Dialog
          open={!!pendingAction}
          onClose={() => {
            setPendingAction(null);
            setError("");
          }}
          title={
            pendingAction.type === "complete"
              ? "最終承認の確認"
              : "差し戻しの確認"
          }
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
            {pendingAction.type === "complete" && (
              <p className="text-xs text-gray-500">
                承認するとクリエイターとディレクターに完了通知が送られます。
              </p>
            )}
            {pendingAction.type === "revision" && (
              <p className="text-xs text-gray-500">
                差し戻すとクリエイターとディレクターに修正依頼の通知が送られます。
              </p>
            )}
            <div className="flex justify-end gap-3 pt-2">
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
