import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN", "CREATOR"]);
  if (!isSessionUser(auth)) return auth;

  const { id } = await params;

  try {
    const body = await request.json();
    const { urls } = body as {
      urls: { url: string; platform?: string | null; sortOrder?: number }[];
    };

    if (!urls || urls.length === 0) {
      return NextResponse.json(
        { success: false, error: "参考URLを1つ以上入力してください" },
        { status: 400 }
      );
    }

    // Validate video exists
    const video = await prisma.video.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!video) {
      return NextResponse.json(
        { success: false, error: "動画が見つかりません" },
        { status: 404 }
      );
    }

    // Create reference URLs
    await prisma.referenceUrl.createMany({
      data: urls.map((u, i) => ({
        videoId: id,
        url: u.url,
        platform: u.platform || null,
        sortOrder: u.sortOrder ?? i,
      })),
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Create reference URLs error:", error);
    return NextResponse.json(
      { success: false, error: "参考URLの保存に失敗しました" },
      { status: 500 }
    );
  }
}
