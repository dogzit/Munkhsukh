"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Home,
  BookOpen,
  Clock,
  MessageCircle,
  Search,
  Newspaper,
  User,
  Menu,
  X,
  Users,
  GraduationCap,
  CheckSquare,
  Trophy,
  Shuffle,
  Crown,
  Shield,
  BarChart3,
} from "lucide-react";
import { useMyRoles } from "./useMyRoles";

type NavItem = { icon: LucideIcon; label: string; href: string };

// Доод цэсэнд байнга харагдах 4 товч
const navItems: NavItem[] = [
  { icon: Home, label: "Нүүр", href: "/" },
  { icon: BookOpen, label: "Даалгавар", href: "/homeWork" },
  { icon: Clock, label: "Хуваарь", href: "/timeTable" },
  { icon: MessageCircle, label: "Чат", href: "/chat" },
];

// "Бусад" цэсэнд
const moreItems: (NavItem & { color: string })[] = [
  { icon: Newspaper, label: "Мэдээ", href: "/feed", color: "from-orange-500 to-amber-500" },
  { icon: BarChart3, label: "Санал асуулга", href: "/poll", color: "from-indigo-500 to-blue-500" },
  { icon: Users, label: "Салаа", href: "/branch", color: "from-violet-500 to-fuchsia-500" },
  { icon: GraduationCap, label: "Сурагчид", href: "/students", color: "from-amber-500 to-orange-500" },
  { icon: Search, label: "Хайлт", href: "/search", color: "from-sky-500 to-blue-500" },
  { icon: CheckSquare, label: "Todo", href: "/todo", color: "from-emerald-500 to-teal-500" },
  { icon: Trophy, label: "Тэргүүлэгчид", href: "/leaderboard", color: "from-yellow-500 to-amber-500" },
  { icon: Shuffle, label: "Сурагч сонгох", href: "/random", color: "from-pink-500 to-rose-500" },
  { icon: User, label: "Профайл", href: "/profile", color: "from-slate-500 to-zinc-500" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { isAdmin, isLeader } = useMyRoles();

  // Хуудас солигдоход цэсийг хаана (render үед state тохируулах)
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  const extraItems: (NavItem & { color: string })[] = [
    ...(isLeader
      ? [{ icon: Crown, label: "Даалгавар удирдах", href: "/manage/homework", color: "from-violet-600 to-indigo-500" }]
      : []),
    ...(isAdmin
      ? [{ icon: Shield, label: "Админ панел", href: "/admin", color: "from-rose-500 to-pink-500" }]
      : []),
  ];

  const moreActive = !navItems.some((i) => isActive(pathname, i.href)) &&
    [...moreItems, ...extraItems].some((i) => isActive(pathname, i.href));

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const tabs: (NavItem & { onClick: () => void; active: boolean })[] = [
    ...navItems.map((i) => ({ ...i, onClick: () => go(i.href), active: isActive(pathname, i.href) })),
    {
      icon: open ? X : Menu,
      label: "Бусад",
      href: "#more",
      onClick: () => setOpen((o) => !o),
      active: open || moreActive,
    },
  ];

  return (
    <>
      {/* Бусад цэс — доороос гарч ирнэ */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
      )}
      <div
        className={`lg:hidden fixed inset-x-0 z-40 bottom-[calc(3.6rem_+_env(safe-area-inset-bottom))]
          transition-all duration-300 ease-out
          ${open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0 pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div className="mx-2 mb-2 rounded-3xl border border-border bg-surface/95 backdrop-blur-xl shadow-2xl p-4">
          <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
          <div className="grid grid-cols-4 gap-y-4 gap-x-2">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <button key={item.href} onClick={() => go(item.href)}
                  className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform">
                  <span className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg
                    ${active ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`}>
                    <Icon size={20} className="text-white" />
                  </span>
                  <span className={`text-[10px] font-bold leading-tight text-center ${active ? "text-accent" : "text-on-surface"}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
          {extraItems.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border-subtle space-y-1.5">
              {extraItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.href} onClick={() => go(item.href)}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-2xl hover:bg-card-hover active:scale-[0.98] transition-all">
                    <span className={`w-9 h-9 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                      <Icon size={17} className="text-white" />
                    </span>
                    <span className="text-sm font-bold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <nav className="lg:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/85 backdrop-blur-xl safe-area-bottom">
        <div className="flex items-stretch justify-around gap-0.5 px-1.5 pt-1.5 pb-1">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = item.active;
            return (
              <button
                key={item.href}
                onClick={item.onClick}
                aria-current={active && item.href !== "#more" ? "page" : undefined}
                aria-expanded={item.href === "#more" ? open : undefined}
                className={`relative flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5
                  rounded-xl py-1.5 transition-all duration-200 active:scale-90
                  ${
                    active
                      ? "text-accent bg-accent/10"
                      : "text-on-surface-muted hover:text-on-surface"
                  }`}
              >
                {/* Идэвхтэй хуудасны дээд мөр */}
                {active && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-7 h-1 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent-glow)]" />
                )}
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 2}
                  className={`transition-transform duration-200 ${
                    active ? "scale-110" : ""
                  }`}
                />
                <span className="text-[9px] font-bold leading-none truncate max-w-full px-0.5">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
