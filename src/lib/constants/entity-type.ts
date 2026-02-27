import type { EntityType } from "@prisma/client";

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  INDIVIDUAL: "個人",
  CORPORATION: "法人",
};
