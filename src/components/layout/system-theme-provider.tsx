"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function SystemThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const system = pathname.startsWith("/delivery") ? "delivery" : "video";

  useEffect(() => {
    document.documentElement.setAttribute("data-system", system);
    return () => {
      document.documentElement.removeAttribute("data-system");
    };
  }, [system]);

  return <>{children}</>;
}
