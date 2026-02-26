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

    // Director approving → auto-transition to FINAL_REVIEW
    // (APPROVED is an intermediate state, skip it and go straight to FINAL_REVIEW)
    if (
      auth.role === "DIRECTOR" &&
      status === "APPROVED" &&
      video.status === "IN_REVIEW"
    ) {
      // First validate IN_REVIEW → APPROVED is valid (it is)
      // Then we'll auto-chain APPROVED → FINAL_REVIEW
      const updated = await prisma.video.update({
        where: { id },
        data: { status: "FINAL_REVIEW" },
        include: {
          project: { select: { id: true, projectCode: true, name: true } },
          creator: { select: { id: true, name: true } },
          director: { select: { id: true, name: true } },
        },
      });

      // Notify ALL admins for final review
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN", isActive: true },
        select: { id: true },
      });

      const notifications = admins
        .filter((a) => a.id !== auth.id)
        .map((admin) => ({
          type: "VIDEO_FINAL_REVIEW",
          videoId: id,
          triggeredBy: auth.id,
          targetUserId: admin.id,
          message: `「${updated.title}」がディレクターに承認されました。最終確認をお願いします`,
        }));

      if (notifications.length > 0) {
        await prisma.notification.createMany({ data: notifications });
      }

      return NextResponse.json({ success: true, data: updated });
    }

    // Standard validation
    const allowedStatuses = VALID_TRANSITIONS[video.status];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `「${video.status}」から「${status}」への遷移はできません`,
        },
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
    } else if (auth.role === "ADMIN") {
      if (!["COMPLETED", "REVISION_REQUESTED", "IN_REVIEW"].includes(status)) {
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

    // Create notifications
    const notifications: {
      type: string;
      videoId: string;
      triggeredBy: string;
      targetUserId: string;
      message: string;
    }[] = [];

    if (status === "SUBMITTED" && updated.directorId) {
      // Creator submitted → notify director
      notifications.push({
        type: "VIDEO_SUBMITTED",
        videoId: id,
        triggeredBy: auth.id,
        targetUserId: updated.directorId,
        message: `「${updated.title}」が提出されました`,
      });
    } else if (status === "REVISION_REQUESTED") {
      // Revision requested → notify creator + director (if admin is requesting)
      notifications.push({
        type: "VIDEO_REVISION_REQUESTED",
        videoId: id,
        triggeredBy: auth.id,
        targetUserId: updated.creator.id,
        message: `「${updated.title}」に修正依頼があります`,
      });
      if (
        auth.role === "ADMIN" &&
        updated.directorId &&
        updated.directorId !== auth.id
      ) {
        notifications.push({
          type: "VIDEO_REVISION_REQUESTED",
          videoId: id,
          triggeredBy: auth.id,
          targetUserId: updated.directorId,
          message: `「${updated.title}」が管理者から差し戻されました`,
        });
      }
    } else if (status === "COMPLETED") {
      // Admin approved (COMPLETED) → notify director + creator
      if (updated.directorId && updated.directorId !== auth.id) {
        notifications.push({
          type: "VIDEO_COMPLETED",
          videoId: id,
          triggeredBy: auth.id,
          targetUserId: updated.directorId,
          message: `「${updated.title}」が最終承認されました`,
        });
      }
      notifications.push({
        type: "VIDEO_COMPLETED",
        videoId: id,
        triggeredBy: auth.id,
        targetUserId: updated.creator.id,
        message: `「${updated.title}」が最終承認されました`,
      });
    }

    // Filter out self-notifications and create
    const validNotifications = notifications.filter(
      (n) => n.targetUserId !== auth.id
    );
    if (validNotifications.length > 0) {
      await prisma.notification.createMany({ data: validNotifications });
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
