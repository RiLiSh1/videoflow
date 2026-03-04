import { NextResponse } from "next/server";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  try {
    const { id } = await params;

    const invoice = await prisma.creatorInvoice.findUnique({
      where: { id },
      select: { id: true, verificationStatus: true },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "請求書が見つかりません" },
        { status: 404 }
      );
    }

    const updated = await prisma.creatorInvoice.update({
      where: { id },
      include: {
        paymentNotification: {
          select: { id: true },
        },
      },
      data: {
        verificationStatus: "APPROVED",
        approvedBy: auth.id,
        approvedAt: new Date(),
      },
    });

    // Record history
    try {
      await prisma.invoiceHistory.create({
        data: {
          paymentNotificationId: updated.paymentNotification.id,
          actionType: "APPROVE",
          actorId: auth.id,
          filePath: updated.filePath,
          fileName: updated.fileName,
          fileSize: updated.fileSize,
          extractedSubtotal: updated.extractedSubtotal,
          extractedWithholding: updated.extractedWithholding,
          extractedNetAmount: updated.extractedNetAmount,
          verificationStatus: "APPROVED",
        },
      });
    } catch (historyError) {
      console.error("Invoice approve - history record error:", historyError);
    }

    return NextResponse.json({
      success: true,
      data: { id: updated.id, verificationStatus: updated.verificationStatus },
    });
  } catch (error) {
    console.error("Invoice approve error:", error);
    return NextResponse.json(
      { success: false, error: "承認に失敗しました" },
      { status: 500 }
    );
  }
}
