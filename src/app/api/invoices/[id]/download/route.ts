export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { readInvoiceFile } from "@/lib/invoice-storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["CREATOR", "DIRECTOR", "ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  try {
    const { id: paymentNotificationId } = await params;

    const invoice = await prisma.creatorInvoice.findUnique({
      where: { paymentNotificationId },
      include: {
        paymentNotification: {
          select: { creatorId: true },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "請求書が見つかりません" },
        { status: 404 }
      );
    }

    if (
      auth.role !== "ADMIN" &&
      invoice.paymentNotification.creatorId !== auth.id
    ) {
      return NextResponse.json(
        { success: false, error: "アクセス権限がありません" },
        { status: 403 }
      );
    }

    const buffer = await readInvoiceFile(invoice.filePath);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(invoice.fileName)}`,
      },
    });
  } catch (error) {
    console.error("Invoice download error:", error);
    return NextResponse.json(
      { success: false, error: "請求書のダウンロードに失敗しました" },
      { status: 500 }
    );
  }
}
