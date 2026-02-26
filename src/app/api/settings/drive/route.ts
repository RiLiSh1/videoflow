import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

export async function GET() {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const settings = await prisma.googleDriveSetting.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: settings });
}

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  try {
    const body = await request.json();
    const { name, driveId, rootFolderId, serviceAccountKey } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: "設定名を入力してください" },
        { status: 400 }
      );
    }

    const setting = await prisma.googleDriveSetting.create({
      data: {
        name: name.trim(),
        driveId: driveId || null,
        rootFolderId: rootFolderId || null,
        serviceAccountKey: serviceAccountKey || null,
      },
    });

    return NextResponse.json({ success: true, data: setting }, { status: 201 });
  } catch (error) {
    console.error("Create drive setting error:", error);
    return NextResponse.json(
      { success: false, error: "設定の作成に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  try {
    const body = await request.json();
    const { id, name, driveId, rootFolderId, serviceAccountKey, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "設定IDが必要です" },
        { status: 400 }
      );
    }

    const setting = await prisma.googleDriveSetting.update({
      where: { id },
      data: {
        name: name?.trim(),
        driveId: driveId || null,
        rootFolderId: rootFolderId || null,
        serviceAccountKey: serviceAccountKey || null,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ success: true, data: setting });
  } catch (error) {
    console.error("Update drive setting error:", error);
    return NextResponse.json(
      { success: false, error: "設定の更新に失敗しました" },
      { status: 500 }
    );
  }
}
