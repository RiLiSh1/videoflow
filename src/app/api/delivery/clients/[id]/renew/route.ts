import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

// POST: 契約更新
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const existing = await prisma.deliveryClient.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json(
      { success: false, error: "クライアントが見つかりません" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const { contractMonths, contractEndDate, renewalNote } = body;

  // 新しい契約開始日 = 既存の契約終了日の翌日 or 今日
  const newStartDate = existing.contractEndDate
    ? new Date(existing.contractEndDate.getTime() + 86400000)
    : new Date();

  // 契約期間から終了日を算出（contractEndDateが直接指定されていなければ）
  let newEndDate: Date;
  if (contractEndDate) {
    newEndDate = new Date(contractEndDate);
  } else if (contractMonths) {
    newEndDate = new Date(newStartDate);
    newEndDate.setMonth(newEndDate.getMonth() + parseInt(contractMonths, 10));
    newEndDate.setDate(newEndDate.getDate() - 1); // 開始月の前日
  } else {
    // デフォルト: 既存の契約月数で更新、なければ6ヶ月
    const months = existing.contractMonths || 6;
    newEndDate = new Date(newStartDate);
    newEndDate.setMonth(newEndDate.getMonth() + months);
    newEndDate.setDate(newEndDate.getDate() - 1);
  }

  const client = await prisma.deliveryClient.update({
    where: { id: params.id },
    data: {
      contractStartDate: newStartDate,
      contractEndDate: newEndDate,
      contractMonths: contractMonths
        ? parseInt(contractMonths, 10)
        : existing.contractMonths,
      contractStatus: "RENEWED",
      renewalNote: renewalNote || null,
      lastRenewedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, data: client });
}
