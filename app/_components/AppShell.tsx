"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import ThemeToggle from "./ThemeToggle";
import RefreshButton from "./RefreshButton";
import NotificationBell from "./NotificationBell";
import MobileAdminPill from "./MobileAdminPill";
import PushPrompt from "./PushPrompt";
import LiveAlerts from "./LiveAlerts";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAuthPage = pathname.startsWith("/auth/");

  if (isAuthPage) {
    return <>{children}</>;
  }

  // Админ хуудсууд өөрийн AdminSidebar ашиглана → сурагчийн sidebar
  // дээш нь давхардаггүй. Dashboard (`/admin`) AppHeader-тай тул
  // floating товч тэнд хэрэггүй; бусад админ дэд хуудасанд үлдээнэ.
  const isAdminPage = pathname.startsWith("/admin");
  const showFloatingActions = isAdminPage && pathname !== "/admin";

  return (
    <div className="flex min-h-screen">
      {!isAdminPage && <Sidebar />}

      {/* min-w-0: хажуу тийш гүйдэг мөр (даалгаврын хичээлийн товчнууд г.м.)
          байхад хуудас бүхэлдээ дэлгэцээс өргөсөхгүй */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen pb-[calc(3.75rem_+_env(safe-area-inset-bottom))] lg:pb-0">
        <main className="flex-1">{children}</main>
      </div>

      <MobileNav />
      <MobileAdminPill />
      {!isAdminPage && <PushPrompt />}
      <LiveAlerts />

      {showFloatingActions && (
        <div className="fixed top-2.5 right-2.5 sm:top-4 sm:right-4 z-50 flex items-center gap-1.5 sm:gap-2">
          <NotificationBell />
          <RefreshButton />
          <ThemeToggle />
        </div>
      )}
    </div>
  );
}
