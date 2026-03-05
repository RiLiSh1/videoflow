import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

// GET: クライアント詳細
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const client = await prisma.deliveryClient.findUnique({
    where: { id: params.id },
    include: {
      videoStocks: { orderBy: { createdAt: "desc" } },
      deliverySchedules: {
        orderBy: { weekStart: "desc" },
        include: { videoStock: true },
      },
    },
  });

  if (!client) {
    return NextResponse.json(
      { success: false, error: "クライアントが見つかりません" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: client });
}

// PUT: クライアント更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    isActive,
    contractStartDate,
    contractEndDate,
    contractMonths,
    monthlyDeliveryCount,
    contractStatus,
    renewalNote,
    lastRenewedAt,
  } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (lineGroupId !== undefined) data.lineGroupId = lineGroupId || null;
  if (googleDriveFolderId !== undefined) data.googleDriveFolderId = googleDriveFolderId || null;
  if (contactName !== undefined) data.contactName = contactName || null;
  if (contactEmail !== undefined) data.contactEmail = contactEmail || null;
  if (note !== undefined) data.note = note || null;
  if (isActive !== undefined) data.isActive = isActive;
  if (contractStartDate !== undefined) data.contractStartDate = contractStartDate ? new Date(contractStartDate) : null;
  if (contractEndDate !== undefined) data.contractEndDate = contractEndDate ? new Date(contractEndDate) : null;
  if (contractMonths !== undefined) data.contractMonths = contractMonths ? parseInt(String(contractMonths), 10) : null;
  if (monthlyDeliveryCount !== undefined) data.monthlyDeliveryCount = monthlyDeliveryCount ? parseInt(String(monthlyDeliveryCount), 10) : 1;
  if (contractStatus !== undefined) data.contractStatus = contractStatus;
  if (renewalNote !== undefined) data.renewalNote = renewalNote || null;
  if (lastRenewedAt !== undefined) data.lastRenewedAt = lastRenewedAt ? new Date(lastRenewedAt) : null;

  const client = await prisma.deliveryClient.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({ success: true, data: client });
}

// PUT: 契約更新（専用エンドポイントは /renew で別途）
// DELETE: クライアント削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  await prisma.deliveryClient.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
