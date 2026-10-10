"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import LogoutConfirm from "./LogoutConfirm";
import { useMyRoles } from "./useMyRoles";
import {
  Home,
  BookOpen,
  Clock,
  CheckSquare,
  MessageCircle,
  Search,
  Newspaper,
  Shuffle,
  User,
  Settings,
  Trophy,
  Users,
  Crown,
  GraduationCap,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  BarChart3,
} from "lucide-react";

const navItems = [
  { icon: <Home size={20} />, label: "Нүүр хуудас", href: "/" },
  { icon: <BookOpen size={20} />, label: "Даалгавар", href: "/homeWork" },
  { icon: <Clock size={20} />, label: "Хуваарь", href: "/timeTable" },
  { icon: <CheckSquare size={20} />, label: "Todo", href: "/todo" },
  { icon: <MessageCircle size={20} />, label: "Чат", href: "/chat" },
  { icon: <Search size={20} />, label: "Хайлт", href: "/search" },
  { icon: <Newspaper size={20} />, label: "Мэдээ", href: "/feed" },
  { icon: <Users size={20} />, label: "Салаа", href: "/branch" },
  { icon: <BarChart3 size={20} />, label: "Санал асуулга", href: "/poll" },
  { icon: <GraduationCap size={20} />, label: "Сурагчид", href: "/students" },
  { icon: <Shuffle size={20} />, label: "Сурагч сонгох", href: "/random" },
  { icon: <Trophy size={20} />, label: "Тэргүүлэгчид", href: "/leaderboard" },
];

const COLLAPSED_KEY = "sidebar_collapsed";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Sidebar() {
  const { isLeader } = useMyRoles();
  const router = useRouter();
  const pathname = usePathname();
  const [showLogout, setShowLogout] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
    setIsAdmin(
      localStorage.getItem("role") === "ADMIN" ||
        (localStorage.getItem("name") ?? "").toLowerCase() === "admin",
    );
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  };

  if (!mounted) {
    // Avoid layout flicker while reading localStorage.
    return <aside className="hidden lg:flex w-64 shrink-0" aria-hidden />;
  }

  const width = collapsed ? "w-16" : "w-64";

  return (
    <aside
      className={`hidden lg:flex flex-col ${width} h-screen sticky top-0 border-r border-border bg-surface/80 backdrop-blur-xl transition-[width] duration-300 ease-out overflow-hidden`}
    >
      {/* Logo + toggle */}
      <div className="px-3 py-4 flex items-center justify-between gap-2">
        <div
          className={`flex items-center gap-3 min-w-0 ${collapsed ? "px-1" : "px-2"}`}
        >
          <div className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg">
            <span className="text-lg">🎓</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-black bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent truncate">
                11A Анги
              </p>
              <p className="text-[9px] text-on-surface-muted uppercase tracking-widest">
                Web App
              </p>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            onClick={toggle}
            aria-label="Sidebar хаах"
            className="shrink-0 p-2 rounded-xl text-on-surface-muted hover:bg-card-hover hover:text-on-surface transition-colors"
          >
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={toggle}
          aria-label="Sidebar нээх"
          className="mx-3 mb-2 p-2 rounded-xl text-on-surface-muted hover:bg-card-hover hover:text-on-surface transition-colors flex items-center justify-center"
        >
          <PanelLeft size={16} />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {[
          ...navItems,
          ...(isLeader
            ? [{ icon: <Crown size={20} />, label: "Даалгавар удирдах", href: "/manage/homework" }]
            : []),
        ].map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center ${collapsed ? "justify-center px-0" : "gap-3 px-3"} py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${
                  active
                    ? "bg-accent/15 text-accent border border-accent/20"
                    : "text-on-surface-muted hover:text-on-surface hover:bg-card-hover border border-transparent"
                }`}
            >
              <span className={active ? "text-accent" : "text-on-surface-muted"}>
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-1">
        <div className="border-t border-border-subtle mb-2" />
        <button
          onClick={() => router.push("/profile")}
          title={collapsed ? "Профайл" : undefined}
          className={`w-full flex items-center ${collapsed ? "justify-center px-0" : "gap-3 px-3"} py-2.5 rounded-xl text-sm font-medium text-on-surface-muted
            hover:text-on-surface hover:bg-card-hover transition-all duration-200`}
        >
          <User size={20} />
          {!collapsed && "Профайл"}
        </button>
        {isAdmin && (
          <button
            onClick={() => router.push("/admin")}
            title={collapsed ? "Админ" : undefined}
            className={`w-full flex items-center ${collapsed ? "justify-center px-0" : "gap-3 px-3"} py-2.5 rounded-xl text-sm font-medium text-on-surface-muted
              hover:text-on-surface hover:bg-card-hover transition-all duration-200`}
          >
            <Settings size={20} />
            {!collapsed && "Админ"}
          </button>
        )}
        <button
          onClick={() => setShowLogout(true)}
          title={collapsed ? "Гарах" : undefined}
          className={`w-full flex items-center ${collapsed ? "justify-center px-0" : "gap-3 px-3"} py-2.5 rounded-xl text-sm font-medium text-on-surface-muted
            hover:text-red-400 hover:bg-red-500/10 transition-all duration-200`}
        >
          <LogOut size={20} />
          {!collapsed && "Гарах"}
        </button>
      </div>

      <LogoutConfirm open={showLogout} onClose={() => setShowLogout(false)} />
    </aside>
  );
}
