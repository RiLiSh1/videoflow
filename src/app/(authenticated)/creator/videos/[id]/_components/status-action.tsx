"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { VideoStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";

interface StatusActionProps {
  videoId: string;
  currentStatus: VideoStatus;
}

export function StatusAction({ videoId, currentStatus }: StatusActionProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Creators can only transition DRAFT -> SUBMITTED or REVISION_REQUESTED -> REVISED
  let targetStatus: VideoStatus | null = null;
  let buttonLabel = "";

  if (currentStatus === "DRAFT") {
    targetStatus = "SUBMITTED";
    buttonLabel = "レビューに提出";
  } else if (currentStatus === "REVISION_REQUESTED") {
    targetStatus = "REVISED";
    buttonLabel = "修正完了として提出";
  }

  if (!targetStatus) return null;

  const handleSubmit = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/videos/${videoId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "ステータスの更新に失敗しました");
        return;
      }

      router.refresh();
    } catch {
      setError("ステータスの更新に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={handleSubmit} loading={isSubmitting}>
        {buttonLabel}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
