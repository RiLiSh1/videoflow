import type { VideoStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  VIDEO_STATUS_LABELS,
  VIDEO_STATUS_COLORS,
} from "@/lib/constants/video-status";
import {
  PenLine,
  Send,
  Eye,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  CircleCheckBig,
} from "lucide-react";

const ICON_MAP: Record<
  VideoStatus,
  React.ComponentType<{ className?: string }>
> = {
  DRAFT: PenLine,
  SUBMITTED: Send,
  IN_REVIEW: Eye,
  REVISION_REQUESTED: RotateCcw,
  REVISED: RefreshCw,
  APPROVED: CheckCircle2,
  FINAL_REVIEW: ShieldCheck,
  COMPLETED: CircleCheckBig,
};

interface StatusBadgeProps {
  status: VideoStatus;
  showIcon?: boolean;
}

export function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
  const Icon = ICON_MAP[status];
  return (
    <Badge className={VIDEO_STATUS_COLORS[status]}>
      {showIcon && <Icon className="mr-1 h-3 w-3" />}
      {VIDEO_STATUS_LABELS[status]}
    </Badge>
  );
}
