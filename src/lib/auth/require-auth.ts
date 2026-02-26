import { NextResponse } from "next/server";
import { getSession } from "./session";
import type { Role } from "@prisma/client";
import type { SessionUser } from "@/types/auth";

export async function requireAuth(
  allowedRoles?: Role[]
): Promise<SessionUser | NextResponse> {
  const user = await getSession();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "認証が必要です" },
      { status: 401 }
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { success: false, error: "アクセス権限がありません" },
      { status: 403 }
    );
  }

  return user;
}

export function isSessionUser(
  result: SessionUser | NextResponse
): result is SessionUser {
  return !(result instanceof NextResponse);
}
