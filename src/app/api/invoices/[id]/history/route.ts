import { NextResponse } from "next/server";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["CREATOR", "DIRECTOR", "ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  try {
    const { id: paymentNotificationId } = await params;

    // Verify access
    const notification = await prisma.paymentNotification.findUnique({
      where: { id: paymentNotificationId },
      select: { creatorId: true },
    });

    if (!notification) {
      return NextResponse.json(
        { success: false, error: "支払通知書が見つかりません" },
        { status: 404 }
      );
    }

    if (auth.role !== "ADMIN" && notification.creatorId !== auth.id) {
      return NextResponse.json(
        { success: false, error: "アクセス権限がありません" },
        { status: 403 }
      );
    }

    const history = await prisma.invoiceHistory.findMany({
      where: { paymentNotificationId },
      orderBy: { createdAt: "desc" },
      include: {
        actor: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: history.map((h) => ({
        id: h.id,
        actionType: h.actionType,
        actorName: h.actor.name,
        filePath: h.filePath ? true : false,
        fileName: h.fileName,
        fileSize: h.fileSize,
        extractedSubtotal: h.extractedSubtotal,
        extractedWithholding: h.extractedWithholding,
        extractedNetAmount: h.extractedNetAmount,
        verificationStatus: h.verificationStatus,
        createdAt: h.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Invoice history fetch error:", error);
    return NextResponse.json(
      { success: false, error: "履歴の取得に失敗しました" },
      { status: 500 }
    );
  }
}
