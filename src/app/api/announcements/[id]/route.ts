import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

// PUT: お知らせ更新（ADMIN のみ）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const { id } = await params;
  const body = await request.json();
  const { title, content, target, isPinned, isPublished } = body;

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title.trim();
  if (content !== undefined) data.content = content.trim();
  if (target !== undefined) data.target = target;
  if (isPinned !== undefined) data.isPinned = isPinned;
  if (isPublished !== undefined) data.isPublished = isPublished;

  const announcement = await prisma.announcement.update({
    where: { id },
    data,
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ success: true, data: announcement });
}

// DELETE: お知らせ削除（ADMIN のみ）
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const { id } = await params;
  await prisma.announcement.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
