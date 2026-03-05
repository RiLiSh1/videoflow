import { prisma } from "@/lib/db";
import { copyVideoToDeliveryFolder } from "./drive-delivery";
import { sendLineDeliveryNotification } from "./line-delivery";
import { updateCalendarEvent } from "./calendar-delivery";

type SendResult = {
  scheduleId: string;
  clientName: string;
  videoTitle: string;
  success: boolean;
  driveUrl?: string;
  error?: string;
};

/**
 * 承認済みスケジュールの送信処理
 * 対象: status=APPROVED かつ scheduledSendAt <= now のスケジュール
 */
export async function sendApprovedDeliveries(targetDate: Date): Promise<SendResult[]> {
  // システム操作用のADMINユーザーを取得
  const systemUser = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true },
    select: { id: true },
  });

  if (!systemUser) {
    throw new Error("アクティブな管理者ユーザーが見つかりません");
  }

  // 対象スケジュール取得
  const schedules = await prisma.deliverySchedule.findMany({
    where: {
      status: "APPROVED",
      scheduledSendAt: { lte: targetDate },
    },
    include: {
      client: true,
      videoStock: true,
    },
  });

  if (schedules.length === 0) {
    return [];
  }

  const results: SendResult[] = [];

  for (const schedule of schedules) {
    try {
      let driveUrl: string | undefined;

      // 1. Google Drive: 動画ファイルを納品フォルダにコピー
      if (schedule.videoStock.googleDriveFileId) {
        try {
          const driveResult = await copyVideoToDeliveryFolder({
            sourceFileId: schedule.videoStock.googleDriveFileId,
            fileName: schedule.videoStock.fileName,
            clientName: schedule.client.name,
            weekStart: schedule.weekStart,
          });
          driveUrl = driveResult.webViewLink;
        } catch (driveError) {
          console.warn("Drive copy failed, continuing:", driveError);
        }
      }

      // 2. LINE: クライアントのLINEグループに通知送信
      if (schedule.client.lineGroupId) {
        try {
          await sendLineDeliveryNotification({
            lineGroupId: schedule.client.lineGroupId,
            clientName: schedule.client.name,
            videoTitle: schedule.videoStock.title,
            driveUrl,
          });
        } catch (lineError) {
          console.warn("LINE send failed, continuing:", lineError);
        }
      }

      // 3. DB更新
      await prisma.$transaction(async (tx) => {
        await tx.deliverySchedule.update({
          where: { id: schedule.id },
          data: {
            status: "SENT",
            actualSentAt: new Date(),
          },
        });

        await tx.videoStock.update({
          where: { id: schedule.videoStockId },
          data: {
            isUsed: true,
            usedAt: new Date(),
          },
        });

        await tx.deliveryChangeLog.create({
          data: {
            scheduleId: schedule.id,
            action: "SEND",
            actorId: systemUser.id,
            detail: {
              sentAt: new Date().toISOString(),
              clientName: schedule.client.name,
              videoTitle: schedule.videoStock.title,
              driveUrl,
            },
          },
        });
      });

      // カレンダーイベント更新（送信済みステータス反映）
      try {
        await updateCalendarEvent(schedule.id);
      } catch (calError) {
        console.warn("Calendar event update failed:", calError);
      }

      results.push({
        scheduleId: schedule.id,
        clientName: schedule.client.name,
        videoTitle: schedule.videoStock.title,
        success: true,
        driveUrl,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";

      // エラーを記録
      await prisma.deliverySchedule.update({
        where: { id: schedule.id },
        data: {
          status: "FAILED",
          sendError: errorMessage,
        },
      });

      results.push({
        scheduleId: schedule.id,
        clientName: schedule.client.name,
        videoTitle: schedule.videoStock.title,
        success: false,
        error: errorMessage,
      });
    }
  }

  return results;
}
