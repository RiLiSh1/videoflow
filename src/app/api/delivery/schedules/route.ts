import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { createCalendarEvent } from "@/lib/delivery/calendar-delivery";

// GET: 配信スケジュール一覧
export async function GET(request: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const status = searchParams.get("status");
  const weekStart = searchParams.get("weekStart");

  const where: Record<string, unknown> = {};
  if (clientId) where.clientId = clientId;
  if (status) where.status = status;
  if (weekStart) where.weekStart = new Date(weekStart);

  const schedules = await prisma.deliverySchedule.findMany({
    where,
    orderBy: { weekStart: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      videoStock: { select: { id: true, title: true, fileName: true } },
      approvals: {
        include: { approver: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json({ success: true, data: schedules });
}

// POST: スケジュール作成
export async function POST(request: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const body = await request.json();
  const { clientId, videoStockId, weekStart } = body;

  if (!clientId || !videoStockId || !weekStart) {
    return NextResponse.json(
      { success: false, error: "クライアント、動画、配信週は必須です" },
      { status: 400 }
    );
  }

  // 1動画=1納品先チェック（videoStockIdがuniqueなので重複時はDBエラー）
  const existing = await prisma.deliverySchedule.findUnique({
    where: { videoStockId },
  });
  if (existing) {
    return NextResponse.json(
      { success: false, error: "この動画は既に別のスケジュールに割り当てられています" },
      { status: 400 }
    );
  }

  const schedule = await prisma.$transaction(async (tx) => {
    const created = await tx.deliverySchedule.create({
      data: {
        clientId,
        videoStockId,
        weekStart: new Date(weekStart),
      },
      include: {
        client: { select: { id: true, name: true } },
        videoStock: { select: { id: true, title: true } },
      },
    });

    await tx.deliveryChangeLog.create({
      data: {
        scheduleId: created.id,
        action: "CREATE",
        actorId: auth.id,
        detail: { clientId, videoStockId, weekStart },
      },
    });

    return created;
  });

  // Googleカレンダーにイベント登録（失敗してもスケジュール作成は成功扱い）
  try {
    await createCalendarEvent(schedule.id);
  } catch (error) {
    console.warn("Calendar event creation failed:", error);
  }

  return NextResponse.json({ success: true, data: schedule }, { status: 201 });
}
