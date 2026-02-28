import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { sendChatworkNotification } from "@/lib/chatwork-notification";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!isSessionUser(auth)) return auth;

  const { id } = await params;

  try {
    const body = await request.json();
    const { versionId, comment, videoTimestamp } = body;

    if (!comment?.trim()) {
      return NextResponse.json(
        { success: false, error: "コメントを入力してください" },
        { status: 400 }
      );
    }

    if (!versionId) {
      return NextResponse.json(
        { success: false, error: "バージョンを指定してください" },
        { status: 400 }
      );
    }

    const feedback = await prisma.feedback.create({
      data: {
        videoId: id,
        versionId,
        userId: auth.id,
        comment: comment.trim(),
        videoTimestamp: videoTimestamp ?? null,
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
        version: { select: { id: true, versionNumber: true } },
      },
    });

    // Notify relevant users
    const video = await prisma.video.findUnique({
      where: { id },
      select: { title: true, creatorId: true, directorId: true },
    });

    if (video) {
      const targetUserId = auth.role === "DIRECTOR" ? video.creatorId : video.directorId;
      if (targetUserId && targetUserId !== auth.id) {
        await prisma.notification.create({
          data: {
            type: "NEW_FEEDBACK",
            videoId: id,
            triggeredBy: auth.id,
            targetUserId,
            message: `「${video.title}」に新しいフィードバックがあります`,
          },
        });
      }
    }

    return NextResponse.json({ success: true, data: feedback }, { status: 201 });
  } catch (error) {
    console.error("Create feedback error:", error);
    return NextResponse.json(
      { success: false, error: "フィードバックの送信に失敗しました" },
      { status: 500 }
    );
  }
}
