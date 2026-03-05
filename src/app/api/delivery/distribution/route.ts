import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

/**
 * GET: 月次配分データ取得
 * クライアント別・週別のスケジュール配分状況
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);

  // 月の開始日〜終了日
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  // クライアント一覧
  const clients = await prisma.deliveryClient.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  // 該当月のスケジュール
  const schedules = await prisma.deliverySchedule.findMany({
    where: {
      weekStart: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    include: {
      client: { select: { id: true, name: true } },
      videoStock: { select: { id: true, title: true } },
    },
    orderBy: { weekStart: "asc" },
  });

  // 未使用ストック数
  const unusedStockCount = await prisma.videoStock.count({
    where: { isUsed: false },
  });

  // クライアント別集計
  const clientSummary = clients.map((client) => {
    const clientSchedules = schedules.filter((s) => s.clientId === client.id);
    return {
      client,
      total: clientSchedules.length,
      sent: clientSchedules.filter((s) => s.status === "SENT").length,
      approved: clientSchedules.filter((s) => s.status === "APPROVED").length,
      pending: clientSchedules.filter(
        (s) => s.status === "DRAFT" || s.status === "PENDING_APPROVAL"
      ).length,
      failed: clientSchedules.filter((s) => s.status === "FAILED").length,
    };
  });

  // 週別集計
  const weekMap = new Map<string, typeof schedules>();
  for (const s of schedules) {
    const weekKey = new Date(s.weekStart).toISOString().split("T")[0];
    if (!weekMap.has(weekKey)) weekMap.set(weekKey, []);
    weekMap.get(weekKey)!.push(s);
  }

  const weekSummary = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, items]) => ({
      week,
      schedules: items.map((s) => ({
        id: s.id,
        clientName: s.client.name,
        videoTitle: s.videoStock.title,
        status: s.status,
      })),
    }));

  return NextResponse.json({
    success: true,
    data: {
      year,
      month,
      clientSummary,
      weekSummary,
      unusedStockCount,
      totalSchedules: schedules.length,
    },
  });
}
