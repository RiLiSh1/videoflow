import type { VideoStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { VIDEO_STATUS_LABELS, VIDEO_STATUS_COLORS } from "@/lib/constants/video-status";

interface StatusBadgeProps {
  status: VideoStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge className={VIDEO_STATUS_COLORS[status]}>
      {VIDEO_STATUS_LABELS[status]}
    </Badge>
  );
}
