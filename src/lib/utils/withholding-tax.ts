import type { EntityType } from "@prisma/client";

/**
 * 源泉徴収税を計算する
 * 個人: ¥100万以下 10.21%, 超過分 20.42%
 * 法人: 0
 */
export function calculateWithholdingTax(
  subtotal: number,
  entityType: EntityType
): number {
  if (entityType === "CORPORATION") return 0;

  const threshold = 1_000_000;

  if (subtotal <= threshold) {
    return Math.floor(subtotal * 0.1021);
  }

  const baseAmount = Math.floor(threshold * 0.1021);
  const excessAmount = Math.floor((subtotal - threshold) * 0.2042);
  return baseAmount + excessAmount;
}
