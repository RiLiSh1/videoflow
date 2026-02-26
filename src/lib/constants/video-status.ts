import type { VideoStatus } from "@prisma/client";

export const VIDEO_STATUS_LABELS: Record<VideoStatus, string> = {
  DRAFT: "下書き",
  SUBMITTED: "提出済み",
  IN_REVIEW: "レビュー中",
  REVISION_REQUESTED: "修正依頼",
  REVISED: "修正済み",
  APPROVED: "承認済み",
  FINAL_REVIEW: "最終確認",
  COMPLETED: "完了",
};

export const VIDEO_STATUS_COLORS: Record<VideoStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  IN_REVIEW: "bg-amber-100 text-amber-800",
  REVISION_REQUESTED: "bg-red-100 text-red-800",
  REVISED: "bg-violet-100 text-violet-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  FINAL_REVIEW: "bg-cyan-100 text-cyan-800",
  COMPLETED: "bg-green-100 text-green-800",
};

export const VIDEO_STATUS_ORDER: VideoStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "REVISION_REQUESTED",
  "REVISED",
  "APPROVED",
  "FINAL_REVIEW",
  "COMPLETED",
];
