import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { z } from "zod";

const createVideoSchema = z.object({
  projectId: z.string().min(1, "案件を選択してください"),
  title: z.string().min(1, "タイトルを入力してください").max(200),
  directorId: z.string().optional(),
  deadline: z.string().optional(),
  referenceUrls: z.array(z.object({
    url: z.string().url(),
    platform: z.string().optional(),
  })).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!isSessionUser(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (projectId) where.projectId = projectId;
  if (status) where.status = status;

  if (auth.role === "CREATOR") {
    where.creatorId = auth.id;
  } else if (auth.role === "DIRECTOR") {
    where.directorId = auth.id;
  }

  const includeDetails = status === "REVISION_REQUESTED";

  const videos = await prisma.video.findMany({
    where,
    include: {
      project: { select: { id: true, projectCode: true, name: true } },
      creator: { select: { id: true, name: true } },
      director: { select: { id: true, name: true } },
      _count: { select: { versions: true, feedbacks: true } },
      ...(includeDetails && {
        referenceUrls: {
          select: { url: true, platform: true },
          orderBy: { sortOrder: "asc" as const },
        },
        feedbacks: {
          select: {
            comment: true,
            videoTimestamp: true,
            createdAt: true,
            user: { select: { name: true, role: true } },
            version: { select: { versionNumber: true } },
          },
          orderBy: { createdAt: "desc" as const },
          take: 10,
        },
      }),
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ success: true, data: videos });
}

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN", "CREATOR"]);
  if (!isSessionUser(auth)) return auth;

  try {
    const body = await request.json();
    const parsed = createVideoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { projectId, title, directorId, deadline, referenceUrls } = parsed.data;

    // Generate video code
    const videoCount = await prisma.video.count({ where: { projectId } });
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { projectCode: true },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "案件が見つかりません" },
        { status: 404 }
      );
    }

    const videoCode = `${project.projectCode}-V${String(videoCount + 1).padStart(3, "0")}`;

    const video = await prisma.video.create({
      data: {
        videoCode,
        projectId,
        title,
        creatorId: auth.role === "CREATOR" ? auth.id : body.creatorId || auth.id,
        directorId: directorId || null,
        deadline: deadline ? new Date(deadline) : null,
        referenceUrls: referenceUrls ? {
          create: referenceUrls.map((ref: { url: string; platform?: string }, i: number) => ({
            url: ref.url,
            platform: ref.platform || null,
            sortOrder: i,
          })),
        } : undefined,
      },
      include: {
        project: { select: { id: true, projectCode: true, name: true } },
        creator: { select: { id: true, name: true } },
        director: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: video }, { status: 201 });
  } catch (error) {
    console.error("Create video error:", error);
    return NextResponse.json(
      { success: false, error: "動画の作成に失敗しました" },
      { status: 500 }
    );
  }
}
