import type { Role } from "@prisma/client";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  group?: string;
};

export const NAV_ITEMS: Record<Role, NavItem[]> = {
  CREATOR: [
    { label: "マイ動画", href: "/creator/videos", icon: "Video" },
    { label: "アップロード", href: "/creator/upload", icon: "Upload" },
  ],
  DIRECTOR: [
    { label: "ダッシュボード", href: "/director/dashboard", icon: "LayoutDashboard" },
    { label: "進捗管理", href: "/director/progress", icon: "BarChart3" },
    { label: "レビュー一覧", href: "/director/reviews", icon: "CheckSquare" },
  ],
  ADMIN: [
    { label: "ダッシュボード", href: "/admin/dashboard", icon: "LayoutDashboard" },
    { label: "進捗管理", href: "/admin/progress", icon: "BarChart3" },
    { label: "承認一覧", href: "/admin/approvals", icon: "ClipboardCheck" },
    { label: "案件管理", href: "/admin/projects", icon: "FolderKanban" },
    { label: "クリエイター管理", href: "/admin/creators", icon: "Palette" },
    { label: "ユーザー管理", href: "/admin/users", icon: "Users" },
    { label: "支払通知書", href: "/admin/payment-notifications", icon: "FileText" },
    { label: "Drive設定", href: "/admin/settings/drive", icon: "HardDrive" },
    { label: "会社設定", href: "/admin/settings/company", icon: "Building2" },
  ],
};

export const PUBLIC_PATHS = ["/login"];

export const ROLE_PATH_PREFIXES: Record<Role, string[]> = {
  ADMIN: ["/admin"],
  DIRECTOR: ["/director"],
  CREATOR: ["/creator"],
};
