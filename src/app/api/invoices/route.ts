export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { extractInvoiceAmounts } from "@/lib/claude/extract-invoice";
import { saveInvoiceFile } from "@/lib/invoice-storage";
import { sendChatworkGroupNotification } from "@/lib/chatwork-notification";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: Request) {
  const auth = await requireAuth(["CREATOR", "DIRECTOR"]);
  if (!isSessionUser(auth)) return auth;

  // 1. Parse form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: "リクエストの解析に失敗しました" },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;
  const paymentNotificationId = formData.get("paymentNotificationId") as string | null;

  if (!file || !paymentNotificationId) {
    return NextResponse.json(
      { success: false, error: "ファイルと支払通知書IDが必要です" },
      { status: 400 }
    );
  }

  // 2. Validate file
  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { success: false, error: "PDFファイルのみアップロード可能です" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { success: false, error: "ファイルサイズは20MB以下にしてください" },
      { status: 400 }
    );
  }

  // 3. Verify ownership
  const notification = await prisma.paymentNotification.findUnique({
    where: { id: paymentNotificationId },
    select: { id: true, creatorId: true, subtotal: true, withholdingTax: true, netAmount: true, year: true, month: true },
  });

  if (!notification) {
    return NextResponse.json(
      { success: false, error: "支払通知書が見つかりません" },
      { status: 404 }
    );
  }

  if (notification.creatorId !== auth.id) {
    return NextResponse.json(
      { success: false, error: "この支払通知書にアクセスする権限がありません" },
      { status: 403 }
    );
  }

  // 4. Save file
  let stored;
  let buffer: Buffer;
  try {
    const bytes = await file.arrayBuffer();
    buffer = Buffer.from(bytes);
    stored = await saveInvoiceFile(paymentNotificationId, file.name, buffer);
  } catch (error) {
    console.error("Invoice upload - file save error:", error);
    return NextResponse.json(
      { success: false, error: "ファイルの保存に失敗しました" },
      { status: 500 }
    );
  }

  // 5. Upsert CreatorInvoice
  let invoice;
  try {
    invoice = await prisma.creatorInvoice.upsert({
      where: { paymentNotificationId },
      create: {
        paymentNotificationId,
        uploadedBy: auth.id,
        filePath: stored.filePath,
        fileName: file.name,
        fileSize: stored.fileSize,
      },
      update: {
        uploadedBy: auth.id,
        filePath: stored.filePath,
        fileName: file.name,
        fileSize: stored.fileSize,
        verificationStatus: "PENDING",
        extractedSubtotal: null,
        extractedWithholding: null,
        extractedNetAmount: null,
        verifiedAt: null,
        approvedBy: null,
        approvedAt: null,
      },
    });
  } catch (error) {
    console.error("Invoice upload - DB upsert error:", error);
    return NextResponse.json(
      { success: false, error: "データベースの更新に失敗しました" },
      { status: 500 }
    );
  }

  // 6. Extract amounts via Claude API (if it fails, leave as PENDING)
  let verificationStatus: "PENDING" | "MATCHED" | "MISMATCHED" = "PENDING";
  let extractedSubtotal: number | null = null;
  let extractedWithholding: number | null = null;
  let extractedNetAmount: number | null = null;

  try {
    const extracted = await extractInvoiceAmounts(buffer);
    extractedSubtotal = extracted.subtotal;
    extractedWithholding = extracted.withholding;
    extractedNetAmount = extracted.netAmount;

    const isClose = (a: number | null, b: number) =>
      a !== null && Math.abs(a - b) <= 1;
    const allMatch =
      isClose(extracted.subtotal, notification.subtotal) &&
      isClose(extracted.withholding, notification.withholdingTax) &&
      isClose(extracted.netAmount, notification.netAmount);

    verificationStatus = allMatch ? "MATCHED" : "MISMATCHED";
  } catch (error) {
    console.error("Invoice upload - Claude extraction error:", error);
  }

  // 7. Update invoice with extraction results
  try {
    const updatedInvoice = await prisma.creatorInvoice.update({
      where: { id: invoice.id },
      data: {
        extractedSubtotal,
        extractedWithholding,
        extractedNetAmount,
        verificationStatus,
        verifiedAt: new Date(),
      },
    });

    // 8. Record history
    try {
      await prisma.invoiceHistory.create({
        data: {
          paymentNotificationId,
          actionType: "UPLOAD",
          actorId: auth.id,
          filePath: stored.filePath,
          fileName: file.name,
          fileSize: stored.fileSize,
          extractedSubtotal,
          extractedWithholding,
          extractedNetAmount,
          verificationStatus,
        },
      });
    } catch (historyError) {
      console.error("Invoice upload - history record error:", historyError);
    }

    // 9. Notify all admins about the invoice upload
    try {
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN", isActive: true },
        select: { id: true },
      });

      if (admins.length > 0) {
        const notifMessage = `「${auth.name}」が${notification.year}年${notification.month}月の請求書をアップロードしました`;
        const created = await prisma.$transaction(
          admins.map((admin) =>
            prisma.notification.create({
              data: {
                type: "INVOICE_UPLOADED",
                videoId: null,
                triggeredBy: auth.id,
                targetUserId: admin.id,
                message: notifMessage,
              },
            })
          )
        );

        sendChatworkGroupNotification({
          notificationIds: created.map((n) => n.id),
          type: "INVOICE_UPLOADED",
          targetUserIds: admins.map((a) => a.id),
          message: notifMessage,
          triggeredByName: auth.name,
        });
      }
    } catch (notifError) {
      console.error("Invoice upload - notification error:", notifError);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedInvoice.id,
        verificationStatus: updatedInvoice.verificationStatus,
        extractedSubtotal: updatedInvoice.extractedSubtotal,
        extractedWithholding: updatedInvoice.extractedWithholding,
        extractedNetAmount: updatedInvoice.extractedNetAmount,
      },
    });
  } catch (error) {
    console.error("Invoice upload - update error:", error);
    return NextResponse.json({
      success: true,
      data: {
        id: invoice.id,
        verificationStatus: "PENDING",
        extractedSubtotal: null,
        extractedWithholding: null,
        extractedNetAmount: null,
      },
    });
  }
}
