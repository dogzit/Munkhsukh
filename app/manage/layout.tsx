"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMyRoles } from "@/app/_components/useMyRoles";

/** Ангийн дарга (болон админ) — админ панелгүйгээр даалгавар удирдах */
export default function ManageLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { roles, canManage } = useMyRoles();

  useEffect(() => {
    if (roles && !canManage) router.replace("/");
  }, [roles, canManage, router]);

  if (!roles || !canManage) return <div className="min-h-screen bg-surface" />;
  return <>{children}</>;
}
