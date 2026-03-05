import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { createCalendarEvent } from "@/lib/delivery/calendar-delivery";

type BatchItem = {
  clientId: string;
  videoStockId: string;
};

// POST: スケジュール一括作成
export async function POST(request: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const body = await request.json();
  const { weekStart, items } = body as {
    weekStart: string;
    items: BatchItem[];
  };

  if (!weekStart || !items || items.length === 0) {
    return NextResponse.json(
      { success: false, error: "配信週とスケジュール項目は必須です" },
      { status: 400 }
    );
  }

  // 重複チェック: 同じ動画が複数回指定されていないか
  const videoIds = items.map((i) => i.videoStockId);
  const uniqueVideoIds = new Set(videoIds);
  if (uniqueVideoIds.size !== videoIds.length) {
    return NextResponse.json(
      { success: false, error: "同じ動画が複数回指定されています" },
      { status: 400 }
    );
  }

  // 既にスケジュールに割り当て済みの動画チェック
  const existingSchedules = await prisma.deliverySchedule.findMany({
    where: { videoStockId: { in: videoIds } },
    select: { videoStockId: true },
  });
  if (existingSchedules.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `${existingSchedules.length}件の動画が既にスケジュールに割り当て済みです`,
      },
      { status: 400 }
    );
  }

  // トランザクションで一括作成
  const schedules = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const item of items) {
      const schedule = await tx.deliverySchedule.create({
        data: {
          clientId: item.clientId,
          videoStockId: item.videoStockId,
          weekStart: new Date(weekStart),
        },
        include: {
          client: { select: { id: true, name: true } },
          videoStock: { select: { id: true, title: true } },
        },
      });

      await tx.deliveryChangeLog.create({
        data: {
          scheduleId: schedule.id,
          action: "CREATE",
          actorId: auth.id,
          detail: {
            clientId: item.clientId,
            videoStockId: item.videoStockId,
            weekStart,
            batch: true,
          },
        },
      });

      created.push(schedule);
    }
    return created;
  });

  // カレンダーイベント登録（失敗しても続行）
  for (const schedule of schedules) {
    try {
      await createCalendarEvent(schedule.id);
    } catch (error) {
      console.warn("Calendar event creation failed:", error);
    }
  }

  return NextResponse.json(
    {
      success: true,
      data: schedules,
      message: `${schedules.length}件のスケジュールを作成しました`,
    },
    { status: 201 }
  );
}
