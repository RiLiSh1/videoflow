import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-do-not-use-in-production"
);

const COOKIE_NAME = "videoflow-session";

const PUBLIC_PATHS = ["/login"];

const ROLE_DEFAULT_PATHS: Record<string, string> = {
  ADMIN: "/admin/dashboard",
  DIRECTOR: "/director/reviews",
  CREATOR: "/creator/videos",
};

const ROLE_PATH_PREFIXES: Record<string, string[]> = {
  ADMIN: ["/admin", "/director", "/creator", "/delivery"],
  DIRECTOR: ["/director"],
  CREATOR: ["/creator"],
};

async function getTokenPayload(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as { sub: string; role: string };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes and static files
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const payload = await getTokenPayload(request);

  // Public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    if (payload) {
      // Already logged in, redirect to default page
      const url = request.nextUrl.clone();
      url.pathname = ROLE_DEFAULT_PATHS[payload.role] || "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Not authenticated
  if (!payload) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Root redirect
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = ROLE_DEFAULT_PATHS[payload.role] || "/login";
    return NextResponse.redirect(url);
  }

  // Role-based path check (ADMIN can access everything)
  const allowedPrefixes = ROLE_PATH_PREFIXES[payload.role] || [];
  const hasAccess = allowedPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!hasAccess) {
    const url = request.nextUrl.clone();
    url.pathname = ROLE_DEFAULT_PATHS[payload.role] || "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
