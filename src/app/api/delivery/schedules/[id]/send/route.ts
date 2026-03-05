import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { copyVideoToDeliveryFolder } from "@/lib/delivery/drive-delivery";
import { sendLineDeliveryNotification } from "@/lib/delivery/line-delivery";
import { updateCalendarEvent } from "@/lib/delivery/calendar-delivery";

/**
 * POST: スケジュールを手動送信（テスト・即時送信用）
 * 承認済みのスケジュールのみ実行可能
 */
export async function POST(
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
    },
  });

  if (!schedule) {
    return NextResponse.json(
      { success: false, error: "スケジュールが見つかりません" },
      { status: 404 }
    );
  }

  if (schedule.status === "SENT") {
    return NextResponse.json(
      { success: false, error: "既に送信済みです" },
      { status: 400 }
    );
  }

  if (schedule.status !== "APPROVED") {
    return NextResponse.json(
      { success: false, error: "承認済みのスケジュールのみ送信できます" },
      { status: 400 }
    );
  }

  try {
    let driveUrl: string | undefined;

    // Google Drive連携
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
        console.warn("Drive copy failed:", driveError);
      }
    }

    // LINE送信
    if (schedule.client.lineGroupId) {
      try {
        await sendLineDeliveryNotification({
          lineGroupId: schedule.client.lineGroupId,
          clientName: schedule.client.name,
          videoTitle: schedule.videoStock.title,
          driveUrl,
        });
      } catch (lineError) {
        console.warn("LINE send failed:", lineError);
      }
    }

    // DB更新
    await prisma.$transaction(async (tx) => {
      await tx.deliverySchedule.update({
        where: { id: params.id },
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
          scheduleId: params.id,
          action: "SEND",
          actorId: auth.id,
          detail: {
            sentAt: new Date().toISOString(),
            clientName: schedule.client.name,
            videoTitle: schedule.videoStock.title,
            driveUrl,
            manual: true,
          },
        },
      });
    });

    // カレンダーイベント更新（送信済みステータス反映）
    try {
      await updateCalendarEvent(params.id);
    } catch (calError) {
      console.warn("Calendar event update failed:", calError);
    }

    return NextResponse.json({
      success: true,
      data: {
        clientName: schedule.client.name,
        videoTitle: schedule.videoStock.title,
        driveUrl,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "不明なエラー";

    await prisma.deliverySchedule.update({
      where: { id: params.id },
      data: {
        status: "FAILED",
        sendError: errorMessage,
      },
    });

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
