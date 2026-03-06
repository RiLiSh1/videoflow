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
    { label: "支払通知書", href: "/creator/payment-notifications", icon: "FileText", group: "請求関連" },
    { label: "請求元情報", href: "/creator/profile", icon: "Users", group: "請求関連" },
    { label: "銀行口座設定", href: "/creator/bank-account", icon: "Landmark", group: "請求関連" },
  ],
  DIRECTOR: [
    { label: "ダッシュボード", href: "/director/dashboard", icon: "LayoutDashboard" },
    { label: "進捗管理", href: "/director/progress", icon: "BarChart3" },
    { label: "レビュー一覧", href: "/director/reviews", icon: "CheckSquare" },
  ],
  ADMIN: [
    { label: "ダッシュボード", href: "/admin/dashboard", icon: "LayoutDashboard" },
    { label: "進捗管理", href: "/admin/progress", icon: "BarChart3" },
    { label: "レビュー一覧", href: "/admin/reviews", icon: "CheckSquare" },
    { label: "承認一覧", href: "/admin/approvals", icon: "ClipboardCheck" },
    { label: "完了一覧", href: "/admin/completed", icon: "CircleCheckBig" },
    { label: "案件管理", href: "/admin/projects", icon: "FolderKanban" },
    { label: "クリエイター管理", href: "/admin/creators", icon: "Palette" },
    { label: "ユーザー管理", href: "/admin/users", icon: "Users" },
    { label: "支払通知書", href: "/admin/payment-notifications", icon: "FileText", group: "請求関連" },
    { label: "会社設定", href: "/admin/settings/company", icon: "Building2", group: "請求関連" },
    { label: "Drive設定", href: "/admin/settings/drive", icon: "HardDrive" },
    { label: "通知設定", href: "/admin/settings/notifications", icon: "MessageSquare" },
  ],
};

// LM動画納品システム ナビゲーション（ADMINのみ）
export const DELIVERY_NAV_ITEMS: NavItem[] = [
  { label: "ダッシュボード", href: "/delivery/dashboard", icon: "LayoutDashboard" },
  { label: "月次配分", href: "/delivery/distribution", icon: "BarChart3" },
  { label: "クライアント管理", href: "/delivery/clients", icon: "Building2" },
  { label: "動画ストック", href: "/delivery/stocks", icon: "Video" },
  { label: "配信スケジュール", href: "/delivery/schedules", icon: "CalendarDays" },
  { label: "変更ログ", href: "/delivery/logs", icon: "FileText" },
  { label: "操作マニュアル", href: "/delivery/manual", icon: "BookOpen", group: "ヘルプ" },
];

export type SystemType = "video" | "delivery";

export const PUBLIC_PATHS = ["/login"];

export const ROLE_PATH_PREFIXES: Record<Role, string[]> = {
  ADMIN: ["/admin"],
  DIRECTOR: ["/director"],
  CREATOR: ["/creator"],
};
