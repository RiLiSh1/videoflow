import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { calculateWithholdingTax } from "@/lib/utils/withholding-tax";
import { sendPaymentApprovalChatwork } from "@/lib/chatwork-payment-notification";
import type { LineItem } from "@/lib/pdf/payment-notification-template";

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  try {
    const body = await request.json();
    // Support both userId (new) and creatorId (backward compat)
    const userId = body.userId || body.creatorId;
    const { year, month } = body;

    if (!userId || !year || !month) {
      return NextResponse.json(
        { success: false, error: "ユーザーID、年、月は必須です" },
        { status: 400 }
      );
    }

    // Get user with profile and compensation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        profile: true,
        compensation: true,
      },
    });

    if (!user || !["CREATOR", "DIRECTOR"].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "対象ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    if (!user.compensation) {
      return NextResponse.json(
        { success: false, error: "報酬設定がされていません" },
        { status: 400 }
      );
    }

    const entityType = user.profile?.entityType || "INDIVIDUAL";
    const compensation = user.compensation;

    // Date range for the target month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Build line items based on compensation type
    type LineItem = {
      no: number;
      projectName: string;
      videoTitle: string;
      videoCode: string;
      amount: number;
    };

    const lineItems: LineItem[] = [];

    if (compensation.type === "CUSTOM" && compensation.isFixedMonthly) {
      // Fixed monthly: single line item
      lineItems.push({
        no: 1,
        projectName: "月額固定報酬",
        videoTitle: `${year}年${month}月分`,
        videoCode: "-",
        amount: compensation.customAmount || 0,
      });
    } else if (compensation.type === "CUSTOM" && !compensation.isFixedMonthly) {
      // Custom non-fixed: single line item
      lineItems.push({
        no: 1,
        projectName: "報酬",
        videoTitle: compensation.customNote || `${year}年${month}月分`,
        videoCode: "-",
        amount: compensation.customAmount || 0,
      });
    } else {
      // PER_VIDEO: 初稿（v1）が対象月にアップロードされた動画を取得（ステータス不問）
      // CREATOR → creatorId, DIRECTOR → directorId
      const videoWhere =
        user.role === "DIRECTOR"
          ? { directorId: userId }
          : { creatorId: userId };

      const videos = await prisma.video.findMany({
        where: {
          ...videoWhere,
          versions: {
            some: {
              versionNumber: 1,
              createdAt: {
                gte: startDate,
                lt: endDate,
              },
            },
          },
        },
        select: {
          id: true,
          videoCode: true,
          title: true,
          project: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      videos.forEach((video, index) => {
        lineItems.push({
          no: index + 1,
          projectName: video.project.name,
          videoTitle: video.title,
          videoCode: video.videoCode,
          amount: compensation.perVideoRate || 0,
        });
      });
    }

    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const withholdingTax = calculateWithholdingTax(subtotal, entityType);
    const netAmount = subtotal - withholdingTax;

    // Upsert payment notification (creatorId field stores the user id)
    const notification = await prisma.paymentNotification.upsert({
      where: {
        creatorId_year_month: {
          creatorId: userId,
          year: Number(year),
          month: Number(month),
        },
      },
      create: {
        creatorId: userId,
        year: Number(year),
        month: Number(month),
        subtotal,
        withholdingTax,
        netAmount,
        lineItemsJson: lineItems,
        generatedBy: auth.id,
      },
      update: {
        subtotal,
        withholdingTax,
        netAmount,
        lineItemsJson: lineItems,
        generatedBy: auth.id,
      },
      include: {
        creator: { select: { id: true, name: true, role: true } },
        generator: { select: { id: true, name: true } },
      },
    });

    // Fire-and-forget Chatwork notification
    sendPaymentApprovalChatwork({
      userId,
      year: Number(year),
      month: Number(month),
      subtotal,
      netAmount,
      lineItems: lineItems as LineItem[],
      triggeredByName: auth.name || "管理者",
      notificationId: notification.id,
      withholdingTax,
    }).catch((err) =>
      console.error("Chatwork payment notification error:", err)
    );

    return NextResponse.json({ success: true, data: notification });
  } catch (error) {
    console.error("Generate payment notification error:", error);
    const message =
      error instanceof Error ? error.message : "支払通知書の生成に失敗しました";
    return NextResponse.json(
      { success: false, error: `支払通知書の生成に失敗しました: ${message}` },
      { status: 500 }
    );
  }
}
