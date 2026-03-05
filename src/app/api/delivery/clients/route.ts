import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

// GET: クライアント一覧取得
export async function GET(request: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const contractStatus = searchParams.get("contractStatus");

  const where: Record<string, unknown> = {};
  if (contractStatus) where.contractStatus = contractStatus;

  const clients = await prisma.deliveryClient.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          videoStocks: true,
          deliverySchedules: true,
        },
      },
    },
  });

  return NextResponse.json({ success: true, data: clients });
}

// POST: クライアント新規作成
export async function POST(request: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const body = await request.json();
  const {
    name,
    lineGroupId,
    googleDriveFolderId,
    contactName,
    contactEmail,
    note,
    contractStartDate,
    contractEndDate,
    contractMonths,
    monthlyDeliveryCount,
    contractStatus,
    renewalNote,
  } = body;

  if (!name) {
    return NextResponse.json(
      { success: false, error: "クライアント名は必須です" },
      { status: 400 }
    );
  }

  const client = await prisma.deliveryClient.create({
    data: {
      name,
      lineGroupId: lineGroupId || null,
      googleDriveFolderId: googleDriveFolderId || null,
      contactName: contactName || null,
      contactEmail: contactEmail || null,
      note: note || null,
      contractStartDate: contractStartDate ? new Date(contractStartDate) : null,
      contractEndDate: contractEndDate ? new Date(contractEndDate) : null,
      contractMonths: contractMonths ? parseInt(contractMonths, 10) : null,
      monthlyDeliveryCount: monthlyDeliveryCount ? parseInt(monthlyDeliveryCount, 10) : 1,
      contractStatus: contractStatus || "ACTIVE",
      renewalNote: renewalNote || null,
    },
  });

  return NextResponse.json({ success: true, data: client }, { status: 201 });
}
