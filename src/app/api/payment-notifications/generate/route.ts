import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { calculateWithholdingTax } from "@/lib/utils/withholding-tax";

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  try {
    const body = await request.json();
    const { creatorId, year, month } = body;

    if (!creatorId || !year || !month) {
      return NextResponse.json(
        { success: false, error: "クリエイターID、年、月は必須です" },
        { status: 400 }
      );
    }

    // Get creator with profile and compensation
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      select: {
        id: true,
        name: true,
        role: true,
        profile: true,
        compensation: true,
      },
    });

    if (!creator || creator.role !== "CREATOR") {
      return NextResponse.json(
        { success: false, error: "クリエイターが見つかりません" },
        { status: 404 }
      );
    }

    if (!creator.compensation) {
      return NextResponse.json(
        { success: false, error: "報酬設定がされていません" },
        { status: 400 }
      );
    }

    const entityType = creator.profile?.entityType || "INDIVIDUAL";
    const compensation = creator.compensation;

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
      // PER_VIDEO: find completed videos for this month
      // Based on Version 1's createdAt falling in the target month
      const videos = await prisma.video.findMany({
        where: {
          creatorId,
          status: "COMPLETED",
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

    // Upsert payment notification
    const notification = await prisma.paymentNotification.upsert({
      where: {
        creatorId_year_month: {
          creatorId,
          year: Number(year),
          month: Number(month),
        },
      },
      create: {
        creatorId,
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
        creator: { select: { id: true, name: true } },
        generator: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: notification });
  } catch (error) {
    console.error("Generate payment notification error:", error);
    return NextResponse.json(
      { success: false, error: "支払通知書の生成に失敗しました" },
      { status: 500 }
    );
  }
}
