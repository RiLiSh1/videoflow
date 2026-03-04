export const runtime = "nodejs";
export const maxDuration = 30;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  InvoiceDocument,
  type InvoicePdfData,
  type InvoiceLineItem,
} from "@/lib/pdf/invoice-template";
import { saveInvoiceFile } from "@/lib/invoice-storage";
import { sendChatworkGroupNotification } from "@/lib/chatwork-notification";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["CREATOR", "DIRECTOR"]);
  if (!isSessionUser(auth)) return auth;

  const { id } = await params;

  // 1. Fetch notification
  let notification;
  try {
    notification = await prisma.paymentNotification.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            profile: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Invoice generate - DB query error:", error);
    return NextResponse.json(
      { success: false, error: "データベースエラーが発生しました" },
      { status: 500 }
    );
  }

  if (!notification) {
    return NextResponse.json(
      { success: false, error: "支払通知書が見つかりません" },
      { status: 404 }
    );
  }

  if (notification.creatorId !== auth.id) {
    return NextResponse.json(
      { success: false, error: "アクセス権限がありません" },
      { status: 403 }
    );
  }

  // 2. Gather data
  let companySettings;
  try {
    companySettings = await prisma.companySettings.findFirst();
  } catch (error) {
    console.error("Invoice generate - company settings error:", error);
  }

  const profile = notification.creator.profile;
  const isIndividual = (profile?.entityType || "INDIVIDUAL") === "INDIVIDUAL";

  const invoiceNumber = `INV-${notification.year}-${String(notification.month).padStart(2, "0")}-${notification.id.slice(-3)}`;

  const now = new Date();
  const issueDate = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

  const lineItems = (notification.lineItemsJson as unknown as InvoiceLineItem[]) || [];

  const pdfData: InvoicePdfData = {
    invoiceNumber,
    issueDate,
    year: notification.year,
    month: notification.month,
    creatorName: notification.creator.name,
    businessName: profile?.businessName,
    creatorPostalCode: profile?.postalCode,
    creatorAddress: profile?.address,
    creatorInvoiceNumber: profile?.invoiceNumber,
    companyName: companySettings?.companyName || "（未設定）",
    companyPostalCode: companySettings?.postalCode,
    companyAddress: companySettings?.address,
    companyTel: companySettings?.tel,
    companyInvoiceNumber: companySettings?.invoiceNumber,
    lineItems,
    subtotal: notification.subtotal,
    withholdingTax: notification.withholdingTax,
    netAmount: notification.netAmount,
    isIndividual,
    bankName: profile?.bankName,
    bankBranch: profile?.bankBranch,
    bankAccountType: profile?.bankAccountType,
    bankAccountNumber: profile?.bankAccountNumber,
    bankAccountHolder: profile?.bankAccountHolder,
  };

  // 3. Render PDF
  let buffer: Buffer;
  try {
    const rawBuffer = await renderToBuffer(InvoiceDocument({ data: pdfData }));
    buffer = Buffer.from(rawBuffer);
  } catch (error) {
    console.error("Invoice generate - PDF render error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "PDFの生成に失敗しました。管理者に連絡してください。",
      },
      { status: 500 }
    );
  }

  const fileName = `請求書_${notification.creator.name}_${notification.year}年${String(notification.month).padStart(2, "0")}月.pdf`;

  // 4. Save file and create DB record
  let stored;
  try {
    stored = await saveInvoiceFile(id, "invoice.pdf", buffer);

    await prisma.creatorInvoice.upsert({
      where: { paymentNotificationId: id },
      create: {
        paymentNotificationId: id,
        uploadedBy: auth.id,
        filePath: stored.filePath,
        fileName,
        fileSize: stored.fileSize,
        extractedSubtotal: notification.subtotal,
        extractedWithholding: notification.withholdingTax,
        extractedNetAmount: notification.netAmount,
        verificationStatus: "MATCHED",
        verifiedAt: new Date(),
      },
      update: {
        uploadedBy: auth.id,
        filePath: stored.filePath,
        fileName,
        fileSize: stored.fileSize,
        extractedSubtotal: notification.subtotal,
        extractedWithholding: notification.withholdingTax,
        extractedNetAmount: notification.netAmount,
        verificationStatus: "MATCHED",
        verifiedAt: new Date(),
        approvedBy: null,
        approvedAt: null,
      },
    });
  } catch (error) {
    console.error("Invoice generate - save error:", error);
    return NextResponse.json(
      { success: false, error: "請求書の保存に失敗しました" },
      { status: 500 }
    );
  }

  // 5. Record history
  try {
    await prisma.invoiceHistory.create({
      data: {
        paymentNotificationId: id,
        actionType: "GENERATE",
        actorId: auth.id,
        filePath: stored.filePath,
        fileName,
        fileSize: stored.fileSize,
        extractedSubtotal: notification.subtotal,
        extractedWithholding: notification.withholdingTax,
        extractedNetAmount: notification.netAmount,
        verificationStatus: "MATCHED",
      },
    });
  } catch (historyError) {
    console.error("Invoice generate - history record error:", historyError);
  }

  // 6. Notify all admins about the invoice
  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: { id: true },
    });

    if (admins.length > 0) {
      const notifMessage = `「${notification.creator.name}」が${notification.year}年${notification.month}月の請求書をアップロードしました`;
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

      await sendChatworkGroupNotification({
        notificationIds: created.map((n) => n.id),
        type: "INVOICE_UPLOADED",
        targetUserIds: admins.map((a) => a.id),
        message: notifMessage,
        triggeredByName: auth.name,
      });
    }
  } catch (notifError) {
    console.error("Invoice generate - notification error:", notifError);
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
