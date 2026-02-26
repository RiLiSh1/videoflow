"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { VideoStatus } from "@prisma/client";

interface StatusActionsProps {
  videoId: string;
  currentStatus: VideoStatus;
}

type ActionConfig = {
  label: string;
  targetStatus: VideoStatus;
  variant: "primary" | "secondary" | "danger";
  confirmTitle: string;
  confirmMessage: string;
};

const STATUS_ACTIONS: Partial<Record<VideoStatus, ActionConfig[]>> = {
  SUBMITTED: [
    {
      label: "レビュー開始",
      targetStatus: "IN_REVIEW",
      variant: "primary",
      confirmTitle: "レビュー開始の確認",
      confirmMessage: "この動画のレビューを開始しますか？",
    },
  ],
  IN_REVIEW: [
    {
      label: "承認",
      targetStatus: "APPROVED",
      variant: "primary",
      confirmTitle: "承認の確認",
      confirmMessage: "この動画を承認しますか？",
    },
    {
      label: "修正依頼",
      targetStatus: "REVISION_REQUESTED",
      variant: "danger",
      confirmTitle: "修正依頼の確認",
      confirmMessage: "この動画に修正を依頼しますか？フィードバックコメントを事前に入力することをお勧めします。",
    },
  ],
  REVISED: [
    {
      label: "再レビュー",
      targetStatus: "IN_REVIEW",
      variant: "primary",
      confirmTitle: "再レビュー開始の確認",
      confirmMessage: "修正された動画のレビューを開始しますか？",
    },
  ],
};

export function StatusActions({ videoId, currentStatus }: StatusActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ActionConfig | null>(null);

  const actions = STATUS_ACTIONS[currentStatus];

  if (!actions || actions.length === 0) {
    return null;
  }

  const handleStatusChange = async (targetStatus: VideoStatus) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/videos/${videoId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      const result = await res.json();

      if (!result.success) {
        setError(result.error || "ステータスの更新に失敗しました");
        return;
      }

      setConfirmAction(null);
      router.refresh();
    } catch {
      setError("ステータスの更新に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {actions.map((action) => (
          <Button
            key={action.targetStatus}
            variant={action.variant}
            onClick={() => setConfirmAction(action)}
          >
            {action.label}
          </Button>
        ))}
      </div>

      {error && (
        <div className="mt-3 rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {confirmAction && (
        <Dialog
          open={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          title={confirmAction.confirmTitle}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{confirmAction.confirmMessage}</p>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setConfirmAction(null)}
                disabled={isLoading}
              >
                キャンセル
              </Button>
              <Button
                variant={confirmAction.variant}
                loading={isLoading}
                onClick={() => handleStatusChange(confirmAction.targetStatus)}
              >
                {confirmAction.label}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
