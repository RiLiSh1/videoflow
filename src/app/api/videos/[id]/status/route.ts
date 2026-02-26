import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import type { VideoStatus } from "@prisma/client";

const VALID_TRANSITIONS: Record<VideoStatus, VideoStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["IN_REVIEW"],
  IN_REVIEW: ["REVISION_REQUESTED", "APPROVED"],
  REVISION_REQUESTED: ["REVISED"],
  REVISED: ["IN_REVIEW"],
  APPROVED: ["FINAL_REVIEW"],
  FINAL_REVIEW: ["COMPLETED", "REVISION_REQUESTED"],
  COMPLETED: [],
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!isSessionUser(auth)) return auth;

  const { id } = await params;

  try {
    const body = await request.json();
    const { status } = body as { status: VideoStatus };

    const video = await prisma.video.findUnique({
      where: { id },
      select: { status: true, creatorId: true, directorId: true },
    });

    if (!video) {
      return NextResponse.json(
        { success: false, error: "動画が見つかりません" },
        { status: 404 }
      );
    }

    const allowedStatuses = VALID_TRANSITIONS[video.status];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `「${video.status}」から「${status}」への遷移はできません` },
        { status: 400 }
      );
    }

    // Role-based permission check
    if (auth.role === "CREATOR") {
      if (!["SUBMITTED", "REVISED"].includes(status)) {
        return NextResponse.json(
          { success: false, error: "この操作の権限がありません" },
          { status: 403 }
        );
      }
    } else if (auth.role === "DIRECTOR") {
      if (!["IN_REVIEW", "REVISION_REQUESTED", "APPROVED"].includes(status)) {
        return NextResponse.json(
          { success: false, error: "この操作の権限がありません" },
          { status: 403 }
        );
      }
    }

    const updated = await prisma.video.update({
      where: { id },
      data: { status },
      include: {
        project: { select: { id: true, projectCode: true, name: true } },
        creator: { select: { id: true, name: true } },
        director: { select: { id: true, name: true } },
      },
    });

    // Create notification
    let targetUserId: string | null = null;
    let message = "";

    if (status === "SUBMITTED" && updated.directorId) {
      targetUserId = updated.directorId;
      message = `「${updated.title}」が提出されました`;
    } else if (status === "REVISION_REQUESTED") {
      targetUserId = updated.creator.id;
      message = `「${updated.title}」に修正依頼があります`;
    } else if (status === "APPROVED" || status === "COMPLETED") {
      targetUserId = updated.creator.id;
      message = `「${updated.title}」が${status === "APPROVED" ? "承認" : "完了"}されました`;
    }

    if (targetUserId && targetUserId !== auth.id) {
      await prisma.notification.create({
        data: {
          type: `VIDEO_${status}`,
          videoId: id,
          triggeredBy: auth.id,
          targetUserId,
          message,
        },
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update video status error:", error);
    return NextResponse.json(
      { success: false, error: "ステータスの更新に失敗しました" },
      { status: 500 }
    );
  }
}
