import { NextResponse } from "next/server";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const bankAccountSchema = z.object({
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  bankAccountType: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankAccountHolder: z.string().optional(),
});

export async function PUT(request: Request) {
  const auth = await requireAuth(["CREATOR", "DIRECTOR"]);
  if (!isSessionUser(auth)) return auth;

  try {
    const body = await request.json();
    const parsed = bankAccountSchema.parse(body);

    const profile = await prisma.creatorProfile.upsert({
      where: { userId: auth.id },
      create: {
        userId: auth.id,
        ...parsed,
      },
      update: parsed,
    });

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "入力内容に誤りがあります" },
        { status: 400 }
      );
    }
    console.error("Bank account update error:", error);
    return NextResponse.json(
      { success: false, error: "銀行口座情報の更新に失敗しました" },
      { status: 500 }
    );
  }
}
