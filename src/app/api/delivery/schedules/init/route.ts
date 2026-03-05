import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

// GET: スケジュール画面の初期データを一括取得
export async function GET(request: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [schedules, clients, availableStocks] = await Promise.all([
    prisma.deliverySchedule.findMany({
      where,
      orderBy: { weekStart: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        videoStock: { select: { id: true, title: true, fileName: true } },
        approvals: {
          include: { approver: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.deliveryClient.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.videoStock.findMany({
      where: { isUsed: false },
      select: { id: true, title: true, fileName: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: { schedules, clients, availableStocks },
  });
}
