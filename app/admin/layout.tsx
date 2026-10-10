"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/app/_components/AdminSidebar";
import { useMyRoles } from "@/app/_components/useMyRoles";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { roles, isAdmin } = useMyRoles();

  // Middleware нь JWT-ийн role-оор шалгадаг тул эрх хасагдсан хүн дахин
  // нэвтрэх хүртэл энд орж магадгүй — өгөгдлийн сангаас дахин шалгана.
  useEffect(() => {
    if (roles && !isAdmin) router.replace("/");
  }, [roles, isAdmin, router]);

  if (!roles || !isAdmin) return <div className="min-h-screen bg-surface" />;

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
