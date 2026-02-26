import type { Role } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/constants/roles";

interface RoleBadgeProps {
  role: Role;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <Badge className={ROLE_COLORS[role]}>
      {ROLE_LABELS[role]}
    </Badge>
  );
}
