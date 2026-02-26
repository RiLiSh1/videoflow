import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!isSessionUser(auth)) return auth;

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true } },
      directors: {
        include: { user: { select: { id: true, name: true } } },
      },
      videos: {
        include: {
          creator: { select: { id: true, name: true } },
          director: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) {
    return NextResponse.json(
      { success: false, error: "案件が見つかりません" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: project });
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
    const { name, description, deadline, status, directorIds } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;
    if (status !== undefined) updateData.status = status;

    if (directorIds) {
      await prisma.projectDirector.deleteMany({ where: { projectId: id } });
      await prisma.projectDirector.createMany({
        data: directorIds.map((userId: string) => ({ projectId: id, userId })),
      });
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true } },
        directors: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    console.error("Update project error:", error);
    return NextResponse.json(
      { success: false, error: "案件の更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const { id } = await params;

  try {
    await prisma.project.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json(
      { success: false, error: "案件の削除に失敗しました" },
      { status: 500 }
    );
  }
}
