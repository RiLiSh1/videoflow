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

  const video = await prisma.video.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, projectCode: true, name: true } },
      creator: { select: { id: true, name: true } },
      director: { select: { id: true, name: true } },
      referenceUrls: { orderBy: { sortOrder: "asc" } },
      versions: {
        include: {
          uploader: { select: { id: true, name: true } },
          feedbacks: {
            include: { user: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { versionNumber: "desc" },
      },
      feedbacks: {
        include: {
          user: { select: { id: true, name: true, role: true } },
          version: { select: { id: true, versionNumber: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!video) {
    return NextResponse.json(
      { success: false, error: "動画が見つかりません" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: video });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!isSessionUser(auth)) return auth;

  const { id } = await params;

  try {
    const body = await request.json();
    const { title, directorId, deadline, videoType, videoTypeOther, deliveryScope, deliveryClientId, menuCategory, menuCategoryNote } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (directorId !== undefined) updateData.directorId = directorId || null;
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;
    if (videoType !== undefined) {
      updateData.videoType = videoType;
      updateData.videoTypeOther = videoType === "OTHER" ? (videoTypeOther || null) : null;
    }
    if (deliveryScope !== undefined) {
      updateData.deliveryScope = deliveryScope;
      updateData.deliveryClientId = deliveryScope === "SELECTED_STORES" ? (deliveryClientId || null) : null;
    }
    if (menuCategory !== undefined) {
      updateData.menuCategory = menuCategory;
      updateData.menuCategoryNote = menuCategory === "OTHER" ? (menuCategoryNote || null) : null;
    }

    // VideoStockも同期更新
    if (deliveryScope !== undefined || menuCategory !== undefined) {
      const existingStock = await prisma.videoStock.findUnique({
        where: { sourceVideoId: id },
      });
      if (existingStock) {
        const stockUpdate: Record<string, unknown> = {};
        if (deliveryScope !== undefined) {
          stockUpdate.deliveryScope = deliveryScope;
          stockUpdate.clientId = deliveryScope === "SELECTED_STORES" ? (deliveryClientId || null) : null;
        }
        if (menuCategory !== undefined) {
          stockUpdate.menuCategory = menuCategory;
          stockUpdate.menuCategoryNote = menuCategory === "OTHER" ? (menuCategoryNote || null) : null;
        }
        await prisma.videoStock.update({
          where: { sourceVideoId: id },
          data: stockUpdate,
        });
      }
    }

    const video = await prisma.video.update({
      where: { id },
      data: updateData,
      include: {
        project: { select: { id: true, projectCode: true, name: true } },
        creator: { select: { id: true, name: true } },
        director: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: video });
  } catch (error) {
    console.error("Update video error:", error);
    return NextResponse.json(
      { success: false, error: "動画の更新に失敗しました" },
      { status: 500 }
    );
  }
}
