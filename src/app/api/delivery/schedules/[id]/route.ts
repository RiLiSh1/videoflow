import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { updateCalendarEvent, deleteCalendarEvent } from "@/lib/delivery/calendar-delivery";

// GET: スケジュール詳細
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const schedule = await prisma.deliverySchedule.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      videoStock: true,
      approvals: {
        include: { approver: { select: { id: true, name: true } } },
      },
      changeLogs: {
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { id: true, name: true } } },
      },
    },
  });

  if (!schedule) {
    return NextResponse.json(
      { success: false, error: "スケジュールが見つかりません" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: schedule });
}

// PUT: スケジュール更新（送信済みは変更不可）
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const existing = await prisma.deliverySchedule.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json(
      { success: false, error: "スケジュールが見つかりません" },
      { status: 404 }
    );
  }

  if (existing.status === "SENT") {
    return NextResponse.json(
      { success: false, error: "送信済みのスケジュールは変更できません" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { clientId, videoStockId, weekStart, status } = body;

  const schedule = await prisma.$transaction(async (tx) => {
    const updated = await tx.deliverySchedule.update({
      where: { id: params.id },
      data: {
        ...(clientId !== undefined && { clientId }),
        ...(videoStockId !== undefined && { videoStockId }),
        ...(weekStart !== undefined && { weekStart: new Date(weekStart) }),
        ...(status !== undefined && { status }),
      },
    });

    await tx.deliveryChangeLog.create({
      data: {
        scheduleId: params.id,
        action: "UPDATE",
        actorId: auth.id,
        detail: { before: existing, after: body },
      },
    });

    return updated;
  });

  // カレンダーイベント更新
  try {
    await updateCalendarEvent(params.id);
  } catch (error) {
    console.warn("Calendar event update failed:", error);
  }

  return NextResponse.json({ success: true, data: schedule });
}

// DELETE: スケジュール削除（送信済みは不可）
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const existing = await prisma.deliverySchedule.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json(
      { success: false, error: "スケジュールが見つかりません" },
      { status: 404 }
    );
  }

  if (existing.status === "SENT") {
    return NextResponse.json(
      { success: false, error: "送信済みのスケジュールは削除できません" },
      { status: 400 }
    );
  }

  // カレンダーイベント削除（DB削除前に実行）
  try {
    await deleteCalendarEvent(params.id);
  } catch (error) {
    console.warn("Calendar event delete failed:", error);
  }

  await prisma.$transaction(async (tx) => {
    await tx.deliveryChangeLog.create({
      data: {
        scheduleId: params.id,
        action: "DELETE",
        actorId: auth.id,
        detail: { deleted: existing },
      },
    });

    await tx.deliverySchedule.delete({ where: { id: params.id } });
  });

  return NextResponse.json({ success: true });
}
