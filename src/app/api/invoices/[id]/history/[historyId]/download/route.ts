export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { readInvoiceFile } from "@/lib/invoice-storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; historyId: string }> }
) {
  const auth = await requireAuth(["CREATOR", "DIRECTOR", "ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  try {
    const { id: paymentNotificationId, historyId } = await params;

    // Fetch history record
    const historyRecord = await prisma.invoiceHistory.findUnique({
      where: { id: historyId },
      include: {
        paymentNotification: {
          select: { creatorId: true },
        },
      },
    });

    if (
      !historyRecord ||
      historyRecord.paymentNotificationId !== paymentNotificationId
    ) {
      return NextResponse.json(
        { success: false, error: "履歴が見つかりません" },
        { status: 404 }
      );
    }

    // Verify access
    if (
      auth.role !== "ADMIN" &&
      historyRecord.paymentNotification.creatorId !== auth.id
    ) {
      return NextResponse.json(
        { success: false, error: "アクセス権限がありません" },
        { status: 403 }
      );
    }

    if (!historyRecord.filePath) {
      return NextResponse.json(
        { success: false, error: "この履歴にはファイルがありません" },
        { status: 404 }
      );
    }

    const buffer = await readInvoiceFile(historyRecord.filePath);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(historyRecord.fileName || "請求書.pdf")}`,
      },
    });
  } catch (error) {
    console.error("Invoice history download error:", error);
    return NextResponse.json(
      { success: false, error: "ダウンロードに失敗しました" },
      { status: 500 }
    );
  }
}
