import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  PaymentNotificationDocument,
  type PaymentNotificationPdfData,
  type LineItem,
} from "@/lib/pdf/payment-notification-template";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const { id } = await params;

  const notification = await prisma.paymentNotification.findUnique({
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

  if (!notification) {
    return NextResponse.json(
      { success: false, error: "支払通知書が見つかりません" },
      { status: 404 }
    );
  }

  const companySettings = await prisma.companySettings.findFirst();

  const profile = notification.creator.profile;
  const isIndividual = (profile?.entityType || "INDIVIDUAL") === "INDIVIDUAL";

  const notificationNumber = `PAY-${notification.year}-${String(notification.month).padStart(2, "0")}-${String(notification.id.slice(-3)).padStart(3, "0")}`;

  const now = new Date();
  const issueDate = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

  const pdfData: PaymentNotificationPdfData = {
    notificationNumber,
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
    lineItems: notification.lineItemsJson as unknown as LineItem[],
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

  const buffer = await renderToBuffer(
    PaymentNotificationDocument({ data: pdfData })
  );

  const fileName = `支払通知書_${notification.creator.name}_${notification.year}年${String(notification.month).padStart(2, "0")}月.pdf`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
