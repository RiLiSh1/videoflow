import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { scheduleApprovedDeliveries } from "@/lib/delivery/schedule-delivery";
import { sendApprovedDeliveries } from "@/lib/delivery/send-delivery";

/**
 * 配信自動送信 Cron ジョブ
 *
 * Vercel Cron: 毎日 10:12 JST (01:12 UTC) に実行
 * 処理内容:
 *   1. 承認済みスケジュールに送信予定日時を設定
 *   2. 送信予定日時が現在以前のスケジュールを送信
 */
export async function GET(request: NextRequest) {
  // Vercel Cron認証（CRON_SECRET）
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const now = new Date();

    // 1. 承認済みスケジュールに送信予定日時を設定
    const scheduled = await scheduleApprovedDeliveries();

    // 2. 送信対象を実行
    const results = await sendApprovedDeliveries(now);

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      data: {
        executedAt: now.toISOString(),
        scheduled,
        sent,
        failed,
        details: results,
      },
    });
  } catch (error) {
    console.error("Delivery cron error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "不明なエラー",
      },
      { status: 500 }
    );
  }
}
