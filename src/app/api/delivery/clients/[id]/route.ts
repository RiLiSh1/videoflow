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
  const { name, lineGroupId, googleDriveFolderId, contactName, contactEmail, note, isActive } = body;

  const client = await prisma.deliveryClient.update({
    where: { id: params.id },
    data: { name, lineGroupId, googleDriveFolderId, contactName, contactEmail, note, isActive },
  });

  return NextResponse.json({ success: true, data: client });
}

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
