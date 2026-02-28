import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

export async function GET() {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const templates = await prisma.notificationTemplate.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ success: true, data: templates });
}

export async function PUT(request: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  try {
    const body = await request.json();
    const { id, title, messageTemplate, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "テンプレートIDが必要です" },
        { status: 400 }
      );
    }

    const template = await prisma.notificationTemplate.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(messageTemplate !== undefined && { messageTemplate: messageTemplate.trim() }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error("Update notification template error:", error);
    return NextResponse.json(
      { success: false, error: "テンプレートの更新に失敗しました" },
      { status: 500 }
    );
  }
}
