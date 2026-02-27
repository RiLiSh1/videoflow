import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  InvoiceDocument,
  type InvoicePdfData,
  type InvoiceLineItem,
} from "@/lib/pdf/invoice-template";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const auth = await requireAuth(["CREATOR", "DIRECTOR"]);
  if (!isSessionUser(auth)) return auth;

  try {
    const { notificationId } = await params;

    const notification = await prisma.paymentNotification.findUnique({
      where: { id: notificationId },
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

    if (notification.creatorId !== auth.id) {
      return NextResponse.json(
        { success: false, error: "アクセス権限がありません" },
        { status: 403 }
      );
    }

    const companySettings = await prisma.companySettings.findFirst();
    const profile = notification.creator.profile;
    const isIndividual = (profile?.entityType || "INDIVIDUAL") === "INDIVIDUAL";

    const invoiceNumber = `INV-${notification.year}-${String(notification.month).padStart(2, "0")}-${notification.id.slice(-3)}`;

    const now = new Date();
    const issueDate = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

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
      lineItems: notification.lineItemsJson as unknown as InvoiceLineItem[],
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

    const buffer = await renderToBuffer(InvoiceDocument({ data: pdfData }));

    const fileName = `請求書_${notification.creator.name}_${notification.year}年${String(notification.month).padStart(2, "0")}月.pdf`;

    // Save to disk and create CreatorInvoice record
    const uploadDir = path.join(UPLOAD_DIR, "invoices", notificationId);
    await mkdir(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const diskFileName = `${timestamp}_invoice.pdf`;
    const filePath = path.join(uploadDir, diskFileName);
    await writeFile(filePath, new Uint8Array(buffer));

    const relativePath = `invoices/${notificationId}/${diskFileName}`;

    // Upsert invoice record — generated invoices auto-match
    await prisma.creatorInvoice.upsert({
      where: { paymentNotificationId: notificationId },
      create: {
        paymentNotificationId: notificationId,
        uploadedBy: auth.id,
        filePath: relativePath,
        fileName,
        fileSize: buffer.byteLength,
        extractedSubtotal: notification.subtotal,
        extractedWithholding: notification.withholdingTax,
        extractedNetAmount: notification.netAmount,
        verificationStatus: "MATCHED",
        verifiedAt: new Date(),
      },
      update: {
        uploadedBy: auth.id,
        filePath: relativePath,
        fileName,
        fileSize: buffer.byteLength,
        extractedSubtotal: notification.subtotal,
        extractedWithholding: notification.withholdingTax,
        extractedNetAmount: notification.netAmount,
        verificationStatus: "MATCHED",
        verifiedAt: new Date(),
        approvedBy: null,
        approvedAt: null,
      },
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    console.error("Invoice generate error:", error);
    return NextResponse.json(
      { success: false, error: "請求書の生成に失敗しました" },
      { status: 500 }
    );
  }
}
