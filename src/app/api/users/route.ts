import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { hashPassword } from "@/lib/auth/password";
import { createUserSchema } from "@/lib/validations/user";

export async function GET() {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      loginId: true,
      name: true,
      email: true,
      role: true,
      chatworkId: true,
      chatworkRoomId: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: users });
}

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  try {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { loginId, password, name, email, role, chatworkId, chatworkRoomId } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { loginId } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "このログインIDは既に使用されています" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        loginId,
        passwordHash,
        name,
        email: email || null,
        role,
        chatworkId: chatworkId || null,
        chatworkRoomId: chatworkRoomId || null,
      },
      select: {
        id: true,
        loginId: true,
        name: true,
        email: true,
        role: true,
        chatworkId: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { success: false, error: "ユーザーの作成に失敗しました" },
      { status: 500 }
    );
  }
}
