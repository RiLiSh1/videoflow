import type { Role } from "@prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "管理者",
  DIRECTOR: "ディレクター",
  CREATOR: "クリエイター",
};

export const ROLE_COLORS: Record<Role, string> = {
  ADMIN: "bg-red-100 text-red-800",
  DIRECTOR: "bg-blue-100 text-blue-800",
  CREATOR: "bg-green-100 text-green-800",
};

export const ROLE_DEFAULT_PATHS: Record<Role, string> = {
  ADMIN: "/admin/dashboard",
  DIRECTOR: "/director/reviews",
  CREATOR: "/creator/videos",
};
