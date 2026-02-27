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

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: id },
  });

  return NextResponse.json({ success: true, data: profile });
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
    const {
      entityType,
      businessName,
      postalCode,
      address,
      invoiceNumber,
      bankName,
      bankBranch,
      bankAccountType,
      bankAccountNumber,
      bankAccountHolder,
    } = body;

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

    const data = {
      entityType: entityType || "INDIVIDUAL",
      businessName: businessName || null,
      postalCode: postalCode || null,
      address: address || null,
      invoiceNumber: invoiceNumber || null,
      bankName: bankName || null,
      bankBranch: bankBranch || null,
      bankAccountType: bankAccountType || null,
      bankAccountNumber: bankAccountNumber || null,
      bankAccountHolder: bankAccountHolder || null,
    };

    const profile = await prisma.creatorProfile.upsert({
      where: { userId: id },
      create: { userId: id, ...data },
      update: data,
    });

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error("Update user profile error:", error);
    return NextResponse.json(
      { success: false, error: "事業者情報の更新に失敗しました" },
      { status: 500 }
    );
  }
}
