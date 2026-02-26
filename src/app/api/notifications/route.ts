import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

export async function GET() {
  const auth = await requireAuth();
  if (!isSessionUser(auth)) return auth;

  const notifications = await prisma.notification.findMany({
    where: { targetUserId: auth.id },
    include: {
      video: { select: { id: true, title: true, videoCode: true } },
      triggerer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ success: true, data: notifications });
}
