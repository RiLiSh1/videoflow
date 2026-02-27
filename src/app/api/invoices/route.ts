import { NextResponse } from "next/server";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { extractInvoiceAmounts } from "@/lib/claude/extract-invoice";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: Request) {
  const auth = await requireAuth(["CREATOR", "DIRECTOR"]);
  if (!isSessionUser(auth)) return auth;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const paymentNotificationId = formData.get("paymentNotificationId") as string | null;

    if (!file || !paymentNotificationId) {
      return NextResponse.json(
        { success: false, error: "ファイルと支払通知書IDが必要です" },
        { status: 400 }
      );
    }

    // PDF validation
    const ext = path.extname(file.name).toLowerCase();
    if (ext !== ".pdf" || file.type !== "application/pdf") {
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

    // Verify ownership
    const notification = await prisma.paymentNotification.findUnique({
      where: { id: paymentNotificationId },
      select: { id: true, creatorId: true, subtotal: true, withholdingTax: true, netAmount: true },
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

    // Save file
    const uploadDir = path.join(UPLOAD_DIR, "invoices", paymentNotificationId);
    await mkdir(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueFileName = `${timestamp}_${sanitizedName}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const relativePath = `invoices/${paymentNotificationId}/${uniqueFileName}`;

    // Upsert CreatorInvoice
    const invoice = await prisma.creatorInvoice.upsert({
      where: { paymentNotificationId },
      create: {
        paymentNotificationId,
        uploadedBy: auth.id,
        filePath: relativePath,
        fileName: file.name,
        fileSize: file.size,
      },
      update: {
        uploadedBy: auth.id,
        filePath: relativePath,
        fileName: file.name,
        fileSize: file.size,
        verificationStatus: "PENDING",
        extractedSubtotal: null,
        extractedWithholding: null,
        extractedNetAmount: null,
        verifiedAt: null,
        approvedBy: null,
        approvedAt: null,
      },
    });

    // Extract amounts via Claude API
    const extracted = await extractInvoiceAmounts(buffer);

    // Compare with notification amounts
    const subtotalMatch = extracted.subtotal === notification.subtotal;
    const withholdingMatch = extracted.withholding === notification.withholdingTax;
    const netAmountMatch = extracted.netAmount === notification.netAmount;
    const allMatch = subtotalMatch && withholdingMatch && netAmountMatch;

    const verificationStatus = allMatch ? "MATCHED" : "MISMATCHED";

    // Update invoice with extraction results
    const updatedInvoice = await prisma.creatorInvoice.update({
      where: { id: invoice.id },
      data: {
        extractedSubtotal: extracted.subtotal,
        extractedWithholding: extracted.withholding,
        extractedNetAmount: extracted.netAmount,
        verificationStatus,
        verifiedAt: new Date(),
      },
    });

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
    console.error("Invoice upload error:", error);
    return NextResponse.json(
      { success: false, error: "請求書のアップロードに失敗しました" },
      { status: 500 }
    );
  }
}
