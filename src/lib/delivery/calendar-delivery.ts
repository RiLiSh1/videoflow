import { google } from "googleapis";
import { getAuth } from "@/lib/google-drive";
import { prisma } from "@/lib/db";
import { getFirstBusinessDayOfWeek } from "./japanese-holidays";

/**
 * Google Calendar 連携
 *
 * 環境変数:
 *   GOOGLE_CALENDAR_ID - 配信スケジュール用カレンダーID
 *                        （デフォルト: primary）
 */

async function getCalendar() {
  const auth = await getAuth();
  return google.calendar({ version: "v3", auth });
}

function getCalendarId(): string {
  return process.env.GOOGLE_CALENDAR_ID || "primary";
}

/**
 * 配信スケジュールをGoogleカレンダーにイベント登録
 */
export async function createCalendarEvent(scheduleId: string): Promise<string> {
  const schedule = await prisma.deliverySchedule.findUnique({
    where: { id: scheduleId },
    include: {
      client: true,
      videoStock: true,
    },
  });

  if (!schedule) throw new Error("スケジュールが見つかりません");

  const calendar = await getCalendar();
  const calendarId = getCalendarId();

  // 送信予定日を計算
  const firstBusinessDay = getFirstBusinessDayOfWeek(new Date(schedule.weekStart));

  // 10:12 - 10:30 JST のイベントとして作成
  const startDate = new Date(firstBusinessDay);
  startDate.setHours(10, 12, 0, 0);
  const endDate = new Date(firstBusinessDay);
  endDate.setHours(10, 30, 0, 0);

  const event = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `📹 納品: ${schedule.client.name}`,
      description: [
        `動画タイトル: ${schedule.videoStock.title}`,
        `ファイル名: ${schedule.videoStock.fileName}`,
        `クライアント: ${schedule.client.name}`,
        `ステータス: ${schedule.status}`,
        "",
        "※ LM動画納品システムから自動登録",
      ].join("\n"),
      start: {
        dateTime: startDate.toISOString(),
        timeZone: "Asia/Tokyo",
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: "Asia/Tokyo",
      },
      colorId: "5", // バナナイエロー
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 30 },
        ],
      },
    },
  });

  const eventId = event.data.id!;

  // DBにイベントIDを保存
  await prisma.deliverySchedule.update({
    where: { id: scheduleId },
    data: { calendarEventId: eventId },
  });

  return eventId;
}

/**
 * カレンダーイベントを更新
 */
export async function updateCalendarEvent(scheduleId: string): Promise<void> {
  const schedule = await prisma.deliverySchedule.findUnique({
    where: { id: scheduleId },
    include: {
      client: true,
      videoStock: true,
    },
  });

  if (!schedule || !schedule.calendarEventId) return;

  const calendar = await getCalendar();
  const calendarId = getCalendarId();

  const firstBusinessDay = getFirstBusinessDayOfWeek(new Date(schedule.weekStart));
  const startDate = new Date(firstBusinessDay);
  startDate.setHours(10, 12, 0, 0);
  const endDate = new Date(firstBusinessDay);
  endDate.setHours(10, 30, 0, 0);

  // ステータスに応じた色
  const colorMap: Record<string, string> = {
    DRAFT: "8",       // グラファイト
    PENDING_APPROVAL: "6", // タンジェリン
    APPROVED: "5",    // バナナ
    SENT: "2",        // セージ
    FAILED: "11",     // トマト
  };

  try {
    await calendar.events.update({
      calendarId,
      eventId: schedule.calendarEventId,
      requestBody: {
        summary: `📹 納品: ${schedule.client.name}${schedule.status === "SENT" ? " ✅" : ""}`,
        description: [
          `動画タイトル: ${schedule.videoStock.title}`,
          `ファイル名: ${schedule.videoStock.fileName}`,
          `クライアント: ${schedule.client.name}`,
          `ステータス: ${schedule.status}`,
          "",
          "※ LM動画納品システムから自動登録",
        ].join("\n"),
        start: {
          dateTime: startDate.toISOString(),
          timeZone: "Asia/Tokyo",
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: "Asia/Tokyo",
        },
        colorId: colorMap[schedule.status] || "5",
      },
    });
  } catch (error) {
    console.warn("Calendar event update failed:", error);
  }
}

/**
 * カレンダーイベントを削除
 */
export async function deleteCalendarEvent(scheduleId: string): Promise<void> {
  const schedule = await prisma.deliverySchedule.findUnique({
    where: { id: scheduleId },
    select: { calendarEventId: true },
  });

  if (!schedule?.calendarEventId) return;

  const calendar = await getCalendar();
  const calendarId = getCalendarId();

  try {
    await calendar.events.delete({
      calendarId,
      eventId: schedule.calendarEventId,
    });
  } catch (error) {
    console.warn("Calendar event delete failed:", error);
  }
}
