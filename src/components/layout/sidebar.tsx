"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Video,
  Upload,
  CheckSquare,
  BarChart3,
  LayoutDashboard,
  ClipboardCheck,
  FolderKanban,
  Users,
  HardDrive,
  Palette,
  FileText,
  Building2,
  MessageSquare,
  CircleCheckBig,
  Landmark,
  CalendarDays,
  Send,
} from "lucide-react";
import type { Role } from "@prisma/client";
import { NAV_ITEMS, DELIVERY_NAV_ITEMS } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import { SystemSwitcher } from "./system-switcher";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Video,
  Upload,
  CheckSquare,
  BarChart3,
  LayoutDashboard,
  ClipboardCheck,
  FolderKanban,
  Users,
  HardDrive,
  Palette,
  FileText,
  Building2,
  MessageSquare,
  CircleCheckBig,
  Landmark,
  CalendarDays,
  Send,
};

interface SidebarProps {
  role: Role;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const isDeliverySystem = pathname.startsWith("/delivery");
  const items = isDeliverySystem ? DELIVERY_NAV_ITEMS : (NAV_ITEMS[role] || []);
  const systemTitle = isDeliverySystem ? "LM-納品システム" : "LM-動画システム";
  const TitleIcon = isDeliverySystem ? Send : Video;

  return (
    <aside className="flex h-screen w-60 flex-col bg-sidebar-bg text-sidebar-text">
      <div className="flex h-16 items-center px-6 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <TitleIcon className="h-6 w-6 text-sidebar-accent" />
          <span className="text-lg font-bold text-white">{systemTitle}</span>
        </Link>
      </div>
      {role === "ADMIN" && <SystemSwitcher />}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {items.map((item, index) => {
            const Icon = ICON_MAP[item.icon];
            const isActive = pathname.startsWith(item.href);
            const prevGroup = index > 0 ? items[index - 1].group : undefined;
            const showGroupHeader = item.group && item.group !== prevGroup;

            return (
              <li key={item.href}>
                {showGroupHeader && (
                  <div className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-sidebar-text/60">
                    {item.group}
                  </div>
                )}
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-active text-sidebar-text-active"
                      : "text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active"
                  )}
                >
                  {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
