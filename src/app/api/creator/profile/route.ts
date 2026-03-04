import { NextResponse } from "next/server";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const profileSchema = z.object({
  entityType: z.enum(["INDIVIDUAL", "CORPORATION"]),
  businessName: z.string().optional(),
  postalCode: z.string().optional(),
  address: z.string().optional(),
  invoiceNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  bankAccountType: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankAccountHolder: z.string().optional(),
});

export async function GET() {
  const auth = await requireAuth(["CREATOR", "DIRECTOR"]);
  if (!isSessionUser(auth)) return auth;

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: auth.id },
  });

  return NextResponse.json({ success: true, data: profile });
}

export async function PUT(request: Request) {
  const auth = await requireAuth(["CREATOR", "DIRECTOR"]);
  if (!isSessionUser(auth)) return auth;

  try {
    const body = await request.json();
    const parsed = profileSchema.parse(body);

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
    console.error("Profile update error:", error);
    return NextResponse.json(
      { success: false, error: "プロフィールの更新に失敗しました" },
      { status: 500 }
    );
  }
}
