import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { createProjectSchema } from "@/lib/validations/project";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!isSessionUser(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const fields = searchParams.get("fields"); // "minimal" = id/name/code only

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  if (auth.role === "DIRECTOR") {
    where.directors = { some: { userId: auth.id } };
  } else if (auth.role === "CREATOR") {
    where.videos = { some: { creatorId: auth.id } };
  }

  // Lightweight mode for select dropdowns
  if (fields === "minimal") {
    const projects = await prisma.project.findMany({
      where,
      select: { id: true, projectCode: true, name: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: projects });
  }

  const projects = await prisma.project.findMany({
    where,
    include: {
      creator: { select: { id: true, name: true } },
      directors: {
        include: { user: { select: { id: true, name: true } } },
      },
      _count: { select: { videos: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: projects });
}

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  try {
    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { projectCode, name, description, directorIds } = parsed.data;

    const existing = await prisma.project.findUnique({
      where: { projectCode },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "この案件コードは既に使用されています" },
        { status: 409 }
      );
    }

    const project = await prisma.project.create({
      data: {
        projectCode,
        name,
        description: description || null,
        deadline: deadline ? new Date(deadline) : null,
        createdBy: auth.id,
        directors: {
          create: directorIds.map((userId: string) => ({ userId })),
        },
      },
      include: {
        creator: { select: { id: true, name: true } },
        directors: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json(
      { success: false, error: "案件の作成に失敗しました" },
      { status: 500 }
    );
  }
}
