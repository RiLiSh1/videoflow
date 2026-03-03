import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

const DEFAULT_TEMPLATES = [
  {
    type: "VIDEO_SUBMITTED",
    title: "動画が提出されました",
    messageTemplate: "「{videoTitle}」が提出されました",
  },
  {
    type: "VIDEO_REVISED",
    title: "修正済み再提出",
    messageTemplate: "「{videoTitle}」が修正されました。再レビューをお願いします",
  },
  {
    type: "VIDEO_REVISION_REQUESTED",
    title: "修正依頼",
    messageTemplate: "「{videoTitle}」に修正依頼があります",
  },
  {
    type: "VIDEO_FINAL_REVIEW",
    title: "最終確認依頼",
    messageTemplate: "「{videoTitle}」がディレクターに承認されました。最終確認をお願いします",
  },
  {
    type: "VIDEO_COMPLETED",
    title: "最終承認完了",
    messageTemplate: "「{videoTitle}」が最終承認されました",
  },
  {
    type: "NEW_FEEDBACK",
    title: "新しいフィードバック",
    messageTemplate: "「{videoTitle}」に新しいフィードバックがあります",
  },
  {
    type: "PAYMENT_APPROVED",
    title: "支払通知書発行",
    messageTemplate:
      "{year}年{month}月分の支払通知書が発行されました。\n振込額: {netAmount}\n{videoDetails}",
  },
];

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "notification_templates" (
      "id" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "message_template" TEXT NOT NULL,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "notification_templates_type_key"
    ON "notification_templates"("type")
  `);
}

async function ensureTemplates() {
  await ensureTable();
  const count = await prisma.notificationTemplate.count();
  if (count === 0) {
    await prisma.notificationTemplate.createMany({ data: DEFAULT_TEMPLATES });
  }
}

export async function GET() {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  try {
    await ensureTemplates();

    const templates = await prisma.notificationTemplate.findMany({
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error("Fetch notification templates error:", error);
    return NextResponse.json(
      { success: false, error: "テンプレートの読み込みに失敗しました" },
      { status: 500 }
    );
  }
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
