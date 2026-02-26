import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!isSessionUser(auth)) return auth;

  const { id } = await params;

  try {
    await prisma.notification.update({
      where: { id, targetUserId: auth.id },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "通知の更新に失敗しました" },
      { status: 500 }
    );
  }
}
