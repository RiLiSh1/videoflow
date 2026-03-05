import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

// GET: クライアント一覧取得
export async function GET() {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const clients = await prisma.deliveryClient.findMany({
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
  const { name, lineGroupId, googleDriveFolderId, contactName, contactEmail, note } = body;

  if (!name) {
    return NextResponse.json(
      { success: false, error: "クライアント名は必須です" },
      { status: 400 }
    );
  }

  const client = await prisma.deliveryClient.create({
    data: { name, lineGroupId, googleDriveFolderId, contactName, contactEmail, note },
  });

  return NextResponse.json({ success: true, data: client }, { status: 201 });
}
