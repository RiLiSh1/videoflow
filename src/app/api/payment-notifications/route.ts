import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const creatorId = searchParams.get("creatorId");
  const role = searchParams.get("role");

  const where: Record<string, unknown> = {};
  if (year) where.year = Number(year);
  if (month) where.month = Number(month);
  if (creatorId) where.creatorId = creatorId;
  if (role) where.creator = { role };

  const notifications = await prisma.paymentNotification.findMany({
    where,
    include: {
      creator: { select: { id: true, name: true, role: true } },
      generator: { select: { id: true, name: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ success: true, data: notifications });
}
