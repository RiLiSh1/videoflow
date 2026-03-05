import { prisma } from "@/lib/db";
import { getFirstBusinessDayOfWeek } from "./japanese-holidays";

/**
 * 承認済みスケジュールに送信予定日時を設定
 * 第1営業日の10:12 (JST) にスケジュール
 */
export async function scheduleApprovedDeliveries(): Promise<number> {
  // scheduledSendAt が未設定の承認済みスケジュールを取得
  const schedules = await prisma.deliverySchedule.findMany({
    where: {
      status: "APPROVED",
      scheduledSendAt: null,
    },
  });

  let count = 0;

  for (const schedule of schedules) {
    const weekStart = new Date(schedule.weekStart);
    const firstBusinessDay = getFirstBusinessDayOfWeek(weekStart);

    // 10:12 JST = 01:12 UTC
    const scheduledSendAt = new Date(firstBusinessDay);
    scheduledSendAt.setUTCHours(1, 12, 0, 0);

    await prisma.deliverySchedule.update({
      where: { id: schedule.id },
      data: { scheduledSendAt },
    });

    count++;
  }

  return count;
}
