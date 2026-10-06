"use client";

import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BookOpen,
  Plus,
  CalendarDays,
  Users,
  Bus,
  ScanLine,
  Database,
  Shield,
  ArrowRight,
} from "lucide-react";

const items: { icon: LucideIcon; label: string; href: string }[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
  { icon: BookOpen, label: "Даалгавар", href: "/admin/homework" },
  { icon: Plus, label: "Шинэ даалгавар", href: "/admin/homework/add" },
  { icon: CalendarDays, label: "Хуваарь", href: "/admin/timeTable" },
  { icon: Users, label: "Хэрэглэгчийн эрх", href: "/admin/users" },
  { icon: Bus, label: "Автобус", href: "/admin/bus" },
  { icon: ScanLine, label: "QR унших", href: "/admin/bus/verify" },
  { icon: Database, label: "Өгөгдөл", href: "/admin/data" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/homework/add") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0 border-r border-border bg-surface/80 backdrop-blur-xl">
      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-3 border-b border-border-subtle">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-red-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
          <Shield size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-black leading-tight">Админ</p>
          <p className="text-[9px] text-on-surface-muted uppercase tracking-widest">
            11A удирдлага
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${
                  active
                    ? "bg-accent/15 text-accent border border-accent/20"
                    : "text-on-surface-muted hover:text-on-surface hover:bg-card-hover border border-transparent"
                }`}
            >
              <Icon size={17} className={active ? "text-accent" : ""} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Back to student app */}
      <div className="px-3 pb-4">
        <div className="border-t border-border-subtle mb-3" />
        <button
          onClick={() => router.push("/")}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium
            text-on-surface-muted hover:text-on-surface hover:bg-card-hover transition-all duration-200"
        >
          Сурагчийн хэсэг
          <ArrowRight size={14} />
        </button>
      </div>
    </aside>
  );
}
