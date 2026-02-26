"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { VideoStatus, Role } from "@prisma/client";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/domain/role-badge";
import { formatDateTime } from "@/lib/utils/format-date";
import {
  CheckCircle2,
  RotateCcw,
  Send,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface VersionInfo {
  id: string;
  versionNumber: number;
}

interface FeedbackItem {
  id: string;
  comment: string;
  videoTimestamp: number | null;
  actionType: string | null;
  createdAt: string;
  user: { id: string; name: string; role: Role };
  version: { id: string; versionNumber: number };
}

interface SerializedVersion {
  id: string;
  versionNumber: number;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  googleDriveUrl: string | null;
  uploaderName: string;
  createdAt: string;
}

interface ReviewClientProps {
  videoId: string;
  currentStatus: VideoStatus;
  latestVersion: VersionInfo | null;
  feedbacks: FeedbackItem[];
  versions: SerializedVersion[];
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function ReviewClient({
  videoId,
  currentStatus,
  latestVersion,
  feedbacks,
}: ReviewClientProps) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAllFeedbacks, setShowAllFeedbacks] = useState(false);

  const isCompleted = ["COMPLETED"].includes(currentStatus);
  const canWriteFeedback = !isCompleted && !!latestVersion;
  const canApproveReject = ["IN_REVIEW"].includes(currentStatus);
  const canStartReview = ["SUBMITTED", "REVISED"].includes(currentStatus);
  const showActions = ["SUBMITTED", "IN_REVIEW", "REVISED", "REVISION_REQUESTED"].includes(currentStatus);

  const handleSendFeedback = async () => {
    if (!comment.trim() || !latestVersion) return;
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const body: Record<string, unknown> = {
        versionId: latestVersion.id,
        comment: comment.trim(),
      };
      if (timestamp) {
        const parsed = parseFloat(timestamp);
        if (!isNaN(parsed) && parsed >= 0) {
          body.videoTimestamp = parsed;
        }
      }

      const res = await fetch(`/api/videos/${videoId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();

      if (!result.success) {
        setError(result.error || "フィードバックの送信に失敗しました");
        return;
      }

      setComment("");
      setTimestamp("");
      setSuccessMessage("フィードバックを送信しました");
      setTimeout(() => setSuccessMessage(null), 3000);
      router.refresh();
    } catch {
      setError("フィードバックの送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approve or reject with auto-transition through IN_REVIEW if needed
  const handleApproveOrReject = async (
    targetStatus: "APPROVED" | "REVISION_REQUESTED",
    label: string
  ) => {
    setStatusLoading(targetStatus);
    setError(null);
    setSuccessMessage(null);

    try {
      // If current status is SUBMITTED or REVISED, first transition to IN_REVIEW
      if (["SUBMITTED", "REVISED"].includes(currentStatus)) {
        const midRes = await fetch(`/api/videos/${videoId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "IN_REVIEW" }),
        });
        const midResult = await midRes.json();
        if (!midResult.success) {
          setError(midResult.error || "ステータスの更新に失敗しました");
          return;
        }
      }

      // Now perform the actual approve/reject
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

      setSuccessMessage(`${label}しました`);
      setTimeout(() => setSuccessMessage(null), 3000);
      router.refresh();
    } catch {
      setError("ステータスの更新に失敗しました");
    } finally {
      setStatusLoading(null);
    }
  };

  const VISIBLE_FEEDBACKS = 5;
  const totalFeedbackCount = feedbacks.length;
  const visibleFeedbacks = showAllFeedbacks
    ? feedbacks
    : feedbacks.slice(0, VISIBLE_FEEDBACKS);

  // Re-group visible feedbacks
  const visibleGrouped = visibleFeedbacks.reduce<
    Record<number, FeedbackItem[]>
  >((acc, fb) => {
    const vn = fb.version.versionNumber;
    if (!acc[vn]) acc[vn] = [];
    acc[vn].push(fb);
    return acc;
  }, {});
  const visibleVersionNumbers = Object.keys(visibleGrouped)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <>
      {/* Notice Banner */}
      {canStartReview && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">
            {currentStatus === "SUBMITTED"
              ? "新しい動画が提出されました"
              : "修正版が提出されました"}
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            動画を確認して、フィードバック・承認・差し戻しを行ってください
          </p>
        </div>
      )}

      {/* Feedback Form */}
      {canWriteFeedback && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-900">
                フィードバック
                <span className="ml-1 text-xs font-normal text-gray-400">
                  v{latestVersion.versionNumber}
                </span>
              </h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Timestamp */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  タイムスタンプ（秒）
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={timestamp}
                    onChange={(e) => setTimestamp(e.target.value)}
                    placeholder="例: 30.5"
                    className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    type="button"
                    onClick={grabTimestamp}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    title="動画の現在位置を取得"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    現在位置
                  </button>
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  コメント
                </label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="フィードバックを入力してください..."
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
              </div>

              {/* Send Button */}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  loading={isSubmitting}
                  disabled={!comment.trim()}
                  onClick={handleSendFeedback}
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  コメント送信
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approve / Reject Actions */}
      {showActions && (
        <Card className="border-primary-200">
          <CardContent>
            <div className="py-2 space-y-3">
              <p className="text-sm font-medium text-gray-700">
                レビュー結果を選択してください
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="danger"
                  loading={statusLoading === "REVISION_REQUESTED"}
                  disabled={currentStatus === "REVISION_REQUESTED"}
                  onClick={() => handleApproveOrReject("REVISION_REQUESTED", "差し戻し")}
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  差し戻し
                </Button>
                <Button
                  variant="primary"
                  loading={statusLoading === "APPROVED"}
                  onClick={() => handleApproveOrReject("APPROVED", "承認")}
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  承認
                </Button>
              </div>
              {currentStatus === "REVISION_REQUESTED" && (
                <p className="text-xs text-amber-600">
                  現在差し戻し中です。修正版を待っています。
                </p>
              )}
              {(canStartReview || canApproveReject) && (
                <p className="text-xs text-gray-400">
                  差し戻す場合は先にフィードバックを送信してください
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3">
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Feedback History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              フィードバック履歴
            </h2>
            {totalFeedbackCount > 0 && (
              <span className="text-xs text-gray-400">
                {totalFeedbackCount}件
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {feedbacks.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              フィードバックはまだありません
            </p>
          ) : (
            <div className="space-y-4">
              {visibleVersionNumbers.map((versionNumber) => (
                <div key={versionNumber}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      v{versionNumber}
                    </span>
                    <div className="flex-1 border-t border-gray-100" />
                  </div>
                  <div className="space-y-2">
                    {visibleGrouped[versionNumber].map((fb) => (
                      <div
                        key={fb.id}
                        className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                      >
                        <div className="mb-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-gray-800">
                              {fb.user.name}
                            </span>
                            <RoleBadge role={fb.user.role} />
                            {fb.videoTimestamp !== null && (
                              <span className="inline-flex items-center rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                                {formatTimestamp(fb.videoTimestamp)}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {formatDateTime(fb.createdAt)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                          {fb.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {totalFeedbackCount > VISIBLE_FEEDBACKS && (
                <button
                  onClick={() => setShowAllFeedbacks(!showAllFeedbacks)}
                  className="w-full flex items-center justify-center gap-1 py-2 text-xs text-primary-600 hover:text-primary-800 transition-colors"
                >
                  {showAllFeedbacks ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      閉じる
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      すべて表示（残り
                      {totalFeedbackCount - VISIBLE_FEEDBACKS}件）
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
