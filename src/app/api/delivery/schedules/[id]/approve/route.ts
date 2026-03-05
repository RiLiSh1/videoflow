import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { updateCalendarEvent } from "@/lib/delivery/calendar-delivery";

// POST: スケジュール承認（管理者3名のうち1名で確定）
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const schedule = await prisma.deliverySchedule.findUnique({
    where: { id: params.id },
    include: { approvals: true },
  });

  if (!schedule) {
    return NextResponse.json(
      { success: false, error: "スケジュールが見つかりません" },
      { status: 404 }
    );
  }

  if (schedule.status === "SENT") {
    return NextResponse.json(
      { success: false, error: "送信済みのスケジュールです" },
      { status: 400 }
    );
  }

  if (schedule.status === "APPROVED") {
    return NextResponse.json(
      { success: false, error: "既に承認済みです" },
      { status: 400 }
    );
  }

  // 既に承認済みかチェック
  const alreadyApproved = schedule.approvals.some(
    (a) => a.approvedBy === auth.id
  );
  if (alreadyApproved) {
    return NextResponse.json(
      { success: false, error: "既にあなたは承認済みです" },
      { status: 400 }
    );
  }

  // 1名承認でスケジュール確定
  const result = await prisma.$transaction(async (tx) => {
    await tx.deliveryApproval.create({
      data: {
        scheduleId: params.id,
        approvedBy: auth.id,
      },
    });

    const updated = await tx.deliverySchedule.update({
      where: { id: params.id },
      data: { status: "APPROVED" },
    });

    await tx.deliveryChangeLog.create({
      data: {
        scheduleId: params.id,
        action: "APPROVE",
        actorId: auth.id,
      },
    });

    return updated;
  });

  // カレンダーイベント更新（承認ステータス反映）
  try {
    await updateCalendarEvent(params.id);
  } catch (error) {
    console.warn("Calendar event update failed:", error);
  }

  return NextResponse.json({ success: true, data: result });
}
