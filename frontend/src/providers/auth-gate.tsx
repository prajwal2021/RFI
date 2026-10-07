"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const isPublic = pathname === "/login" || pathname.startsWith("/public/");
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (isPublic) {
      if (pathname === "/login" && getToken()) router.replace("/");
      setAllowed(true);
      return;
    }
    if (!getToken()) {
      setAllowed(false);
      router.replace("/login");
      return;
    }
    setAllowed(true);
  }, [pathname, isPublic, router]);

  if (!isPublic && !allowed) return null;
  return <>{children}</>;
}
