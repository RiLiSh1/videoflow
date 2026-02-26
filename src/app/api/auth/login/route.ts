import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "入力内容を確認してください" },
        { status: 400 }
      );
    }

    const { loginId, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { loginId },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: "ログインIDまたはパスワードが正しくありません" },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "ログインIDまたはパスワードが正しくありません" },
        { status: 401 }
      );
    }

    await createSession({
      id: user.id,
      loginId: user.loginId,
      name: user.name,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        loginId: user.loginId,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "ログイン処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
