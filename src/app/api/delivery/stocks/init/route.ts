import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

// GET: ストック画面の初期データを一括取得
export async function GET(request: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const isUsed = searchParams.get("isUsed");

  const where: Record<string, unknown> = {};
  if (isUsed === "true") where.isUsed = true;
  if (isUsed === "false") where.isUsed = false;

  const [stocks, clients] = await Promise.all([
    prisma.videoStock.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
      },
    }),
    prisma.deliveryClient.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: { stocks, clients },
  });
}
