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
} from "lucide-react";
import type { Role } from "@prisma/client";
import { NAV_ITEMS } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

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
};

interface SidebarProps {
  role: Role;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role] || [];

  return (
    <aside className="flex h-screen w-60 flex-col bg-sidebar-bg text-sidebar-text">
      <div className="flex h-16 items-center px-6 border-b border-slate-700">
        <Link href="/" className="flex items-center gap-2">
          <Video className="h-6 w-6 text-primary-400" />
          <span className="text-lg font-bold text-white">LM-動画システム</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = ICON_MAP[item.icon];
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
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
