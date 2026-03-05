"use client";

import { usePathname, useRouter } from "next/navigation";
import { Video, Send } from "lucide-react";
import type { SystemType } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

const SYSTEMS = [
  {
    key: "video" as SystemType,
    label: "LM動画システム",
    icon: Video,
    defaultPath: "/admin/dashboard",
  },
  {
    key: "delivery" as SystemType,
    label: "LM動画納品システム",
    icon: Send,
    defaultPath: "/delivery/dashboard",
  },
];

export function SystemSwitcher() {
  const pathname = usePathname();
  const router = useRouter();

  const currentSystem: SystemType = pathname.startsWith("/delivery")
    ? "delivery"
    : "video";

  return (
    <div className="px-3 py-2">
      <div className="rounded-lg bg-black/20 p-1 flex gap-1">
        {SYSTEMS.map((system) => {
          const Icon = system.icon;
          const isActive = currentSystem === system.key;
          return (
            <button
              key={system.key}
              onClick={() => {
                if (!isActive) router.push(system.defaultPath);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-all",
                isActive
                  ? "bg-sidebar-accent text-white shadow-sm"
                  : "text-sidebar-text hover:text-white hover:bg-white/10"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="truncate">
                {system.key === "video" ? "動画" : "納品"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
