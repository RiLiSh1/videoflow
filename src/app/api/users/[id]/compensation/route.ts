import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const { id } = await params;

  const compensation = await prisma.creatorCompensation.findUnique({
    where: { userId: id },
  });

  return NextResponse.json({ success: true, data: compensation });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const { id } = await params;

  try {
    const body = await request.json();
    const { type, perVideoRate, customAmount, customNote, isFixedMonthly } =
      body;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (!user || !["CREATOR", "DIRECTOR"].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "対象ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    const compensation = await prisma.creatorCompensation.upsert({
      where: { userId: id },
      create: {
        userId: id,
        type: type || "PER_VIDEO",
        perVideoRate: perVideoRate != null ? Number(perVideoRate) : null,
        customAmount: customAmount != null ? Number(customAmount) : null,
        customNote: customNote || null,
        isFixedMonthly: isFixedMonthly ?? false,
      },
      update: {
        type: type || "PER_VIDEO",
        perVideoRate: perVideoRate != null ? Number(perVideoRate) : null,
        customAmount: customAmount != null ? Number(customAmount) : null,
        customNote: customNote || null,
        isFixedMonthly: isFixedMonthly ?? false,
      },
    });

    return NextResponse.json({ success: true, data: compensation });
  } catch (error) {
    console.error("Update user compensation error:", error);
    return NextResponse.json(
      { success: false, error: "報酬設定の更新に失敗しました" },
      { status: 500 }
    );
  }
}
