import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

// GET: 変更ログ一覧
export async function GET(request: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const scheduleId = searchParams.get("scheduleId");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const where: Record<string, unknown> = {};
  if (scheduleId) where.scheduleId = scheduleId;

  const [logs, total] = await Promise.all([
    prisma.deliveryChangeLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        actor: { select: { id: true, name: true } },
        schedule: {
          select: {
            id: true,
            client: { select: { name: true } },
            videoStock: { select: { title: true } },
          },
        },
      },
    }),
    prisma.deliveryChangeLog.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: logs, total });
}
