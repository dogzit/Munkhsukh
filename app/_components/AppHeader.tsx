"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, User } from "lucide-react";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import RefreshButton from "./RefreshButton";

const AVATAR_CACHE_KEY = "profile_avatar_cache";

/** Баруун талын товчнууд — header болон banner хоёуланд ашиглаж болно */
export function HeaderActions({ showProfile = true }: { showProfile?: boolean }) {
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setMe(localStorage.getItem("name"));
      // Тухайн хэрэглэгчийн cached avatar-ыг эхэнд харуулна.
      try {
        const cached = localStorage.getItem(AVATAR_CACHE_KEY);
        if (cached) setAvatar(cached);
      } catch {}
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/profile");
        if (!r.ok) return;
        const d = await r.json();
        if (cancelled) return;
        if (typeof d.avatar === "string" && d.avatar) {
          setAvatar(d.avatar);
          try {
            localStorage.setItem(AVATAR_CACHE_KEY, d.avatar);
          } catch {}
        } else {
          setAvatar(null);
          try {
            localStorage.removeItem(AVATAR_CACHE_KEY);
          } catch {}
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
      <NotificationBell />
      <RefreshButton />
      <ThemeToggle />
      {showProfile && (
        <button
          onClick={() => router.push("/profile")}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-surface-elevated border border-border
            hover:scale-110 active:scale-95 transition-all duration-200 overflow-hidden
            flex items-center justify-center text-accent text-xs font-black relative"
          aria-label="Профайл"
        >
          {avatar ? (
            <Image
              src={avatar}
              alt={me ?? "profile"}
              fill
              sizes="36px"
              className="object-cover"
              unoptimized
            />
          ) : me ? (
            me[0]?.toUpperCase()
          ) : (
            <User size={14} />
          )}
        </button>
      )}
    </div>
  );
}

type Props = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  /** Буцах товч харуулах (default: true) */
  showBack?: boolean;
  onBack?: () => void;
  showProfile?: boolean;
  /** Товчнуудын өмнө нэмэлт элемент (жишээ: онлайн цэг) */
  children?: React.ReactNode;
};

/**
 * Бүх хуудсын нэгдсэн header — чат/мэдээ/хайт хуудасны
 * sticky header хэвээр: notification + гарах + theme + профайл.
 */
export default function AppHeader({
  title,
  subtitle,
  icon,
  showBack = true,
  onBack,
  showProfile = true,
  children,
}: Props) {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-30 w-full bg-surface/80 backdrop-blur-xl border-b border-border px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3">
      {showBack && (
        <button
          onClick={() => (onBack ? onBack() : router.push("/"))}
          // Утсан дээр нүүр рүү буцах товч доод цэсэнд байгаа тул зөвхөн onBack-тэй үед харуулна
          className={`p-2 -ml-1 hover:bg-card-hover rounded-xl transition-all shrink-0 ${onBack ? "" : "hidden lg:block"}`}
          aria-label="Буцах"
        >
          <ArrowLeft size={20} />
        </button>
      )}
      {icon}
      <div className="min-w-0 flex-1">
        <h1 className="font-bold text-sm truncate">{title}</h1>
        {subtitle && (
          <p className="text-[10px] text-on-surface-muted truncate">{subtitle}</p>
        )}
      </div>
      {children}
      <HeaderActions showProfile={showProfile} />
    </div>
  );
}
