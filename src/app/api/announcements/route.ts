import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

// GET: お知らせ一覧
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!isSessionUser(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const target = searchParams.get("target");

  const where: Record<string, unknown> = { isPublished: true };

  if (target) {
    // 特定ロール向け + ALL を取得
    where.target = { in: [target, "ALL"] };
  }

  // 管理者は非公開も含めて全件取得可能
  if (auth.role === "ADMIN" && searchParams.get("all") === "true") {
    delete where.isPublished;
    if (target) {
      where.target = target;
    } else {
      delete where.target;
    }
  }

  const announcements = await prisma.announcement.findMany({
    where,
    include: {
      author: { select: { id: true, name: true } },
    },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ success: true, data: announcements });
}

// POST: お知らせ作成（ADMIN のみ）
export async function POST(request: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const body = await request.json();
  const { title, content, target, isPinned, isPublished } = body;

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json(
      { success: false, error: "タイトルと本文は必須です" },
      { status: 400 }
    );
  }

  const announcement = await prisma.announcement.create({
    data: {
      title: title.trim(),
      content: content.trim(),
      target: target || "ALL",
      isPinned: isPinned ?? false,
      isPublished: isPublished ?? true,
      createdBy: auth.id,
    },
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ success: true, data: announcement });
}
