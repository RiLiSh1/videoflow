import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

export async function GET() {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const settings = await prisma.companySettings.findFirst();

  return NextResponse.json({ success: true, data: settings });
}

export async function PUT(request: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  try {
    const body = await request.json();
    const { companyName, postalCode, address, tel, email, invoiceNumber } = body;

    if (!companyName?.trim()) {
      return NextResponse.json(
        { success: false, error: "会社名を入力してください" },
        { status: 400 }
      );
    }

    const existing = await prisma.companySettings.findFirst();

    const data = {
      companyName: companyName.trim(),
      postalCode: postalCode || null,
      address: address || null,
      tel: tel || null,
      email: email || null,
      invoiceNumber: invoiceNumber || null,
    };

    let settings;
    if (existing) {
      settings = await prisma.companySettings.update({
        where: { id: existing.id },
        data,
      });
    } else {
      settings = await prisma.companySettings.create({ data });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("Update company settings error:", error);
    return NextResponse.json(
      { success: false, error: "会社設定の更新に失敗しました" },
      { status: 500 }
    );
  }
}
