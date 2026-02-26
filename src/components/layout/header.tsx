"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import type { SessionUser } from "@/types/auth";
import { RoleBadge } from "@/components/domain/role-badge";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  user: SessionUser;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{user.name}</span>
          <RoleBadge role={user.role} />
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-1" />
          ログアウト
        </Button>
      </div>
    </header>
  );
}
