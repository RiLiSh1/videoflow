import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

// GET: ストック詳細
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const stock = await prisma.videoStock.findUnique({
    where: { id: params.id },
    include: { client: true },
  });

  if (!stock) {
    return NextResponse.json(
      { success: false, error: "ストックが見つかりません" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: stock });
}

// PUT: ストック更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const body = await request.json();
  const { title, fileName, googleDriveFileId, googleDriveUrl, blobUrl, clientId, note, deliveryScope } = body;

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (fileName !== undefined) data.fileName = fileName;
  if (googleDriveFileId !== undefined) data.googleDriveFileId = googleDriveFileId;
  if (googleDriveUrl !== undefined) data.googleDriveUrl = googleDriveUrl;
  if (blobUrl !== undefined) data.blobUrl = blobUrl;
  if (clientId !== undefined) data.clientId = clientId;
  if (note !== undefined) data.note = note;
  if (deliveryScope !== undefined) data.deliveryScope = deliveryScope;

  const stock = await prisma.videoStock.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({ success: true, data: stock });
}

// DELETE: ストック削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const stock = await prisma.videoStock.findUnique({
    where: { id: params.id },
    select: { isUsed: true },
  });

  if (stock?.isUsed) {
    return NextResponse.json(
      { success: false, error: "使用済みのストックは削除できません" },
      { status: 400 }
    );
  }

  await prisma.videoStock.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
