import type { VideoStatus } from "@prisma/client";

export const VIDEO_STATUS_LABELS: Record<VideoStatus, string> = {
  DRAFT: "下書き",
  SUBMITTED: "提出済み",
  IN_REVIEW: "レビュー中",
  REVISION_REQUESTED: "修正依頼",
  REVISED: "修正済み",
  APPROVED: "承認済み",
  FINAL_REVIEW: "最終確認中",
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

/** Icon name (lucide-react) for each status */
export const VIDEO_STATUS_ICONS: Record<VideoStatus, string> = {
  DRAFT: "PenLine",
  SUBMITTED: "Send",
  IN_REVIEW: "Eye",
  REVISION_REQUESTED: "RotateCcw",
  REVISED: "RefreshCw",
  APPROVED: "CheckCircle2",
  FINAL_REVIEW: "ShieldCheck",
  COMPLETED: "CircleCheckBig",
};

/**
 * Workflow phases for the visual stepper.
 * Groups the 8 statuses into 5 intuitive phases.
 */
export const WORKFLOW_PHASES = [
  { label: "作成", statuses: ["DRAFT"] as VideoStatus[], color: "bg-gray-400" },
  { label: "提出", statuses: ["SUBMITTED"] as VideoStatus[], color: "bg-blue-500" },
  {
    label: "レビュー",
    statuses: ["IN_REVIEW", "REVISION_REQUESTED", "REVISED"] as VideoStatus[],
    color: "bg-amber-500",
  },
  {
    label: "承認",
    statuses: ["APPROVED", "FINAL_REVIEW"] as VideoStatus[],
    color: "bg-cyan-500",
  },
  { label: "完了", statuses: ["COMPLETED"] as VideoStatus[], color: "bg-green-500" },
] as const;

/** Get the phase index (0-4) for a given status */
export function getPhaseIndex(status: VideoStatus): number {
  return WORKFLOW_PHASES.findIndex((p) =>
    (p.statuses as readonly VideoStatus[]).includes(status)
  );
}
