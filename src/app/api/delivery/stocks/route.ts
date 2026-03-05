import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

// GET: 動画ストック一覧
export async function GET(request: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const isUsed = searchParams.get("isUsed");

  const where: Record<string, unknown> = {};
  if (clientId) where.clientId = clientId;
  if (isUsed !== null && isUsed !== undefined && isUsed !== "") {
    where.isUsed = isUsed === "true";
  }

  const stocks = await prisma.videoStock.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ success: true, data: stocks });
}

// POST: 動画ストック追加
export async function POST(request: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const body = await request.json();
  const { title, fileName, googleDriveFileId, googleDriveUrl, blobUrl, clientId, note } = body;

  if (!title || !fileName) {
    return NextResponse.json(
      { success: false, error: "タイトルとファイル名は必須です" },
      { status: 400 }
    );
  }

  const stock = await prisma.videoStock.create({
    data: { title, fileName, googleDriveFileId, googleDriveUrl, blobUrl, clientId, note },
  });

  return NextResponse.json({ success: true, data: stock }, { status: 201 });
}
