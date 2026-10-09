"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import PushToggle from "./PushToggle";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  icon: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Сая";
  if (mins < 60) return `${mins}мн`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}цаг`;
  return `${Math.floor(hrs / 24)}өдөр`;
}

export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // тайван
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Гадна дарахад хаана
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      // тайван
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
    } catch {
      // тайван
    }
  };

  const handleClick = (notif: Notification) => {
    if (!notif.read) markAsRead(notif.id);
    if (notif.href) {
      router.push(notif.href);
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-2xl bg-surface-elevated border border-border
          hover:scale-110 active:scale-95 transition-all duration-200
          text-on-surface-muted hover:text-on-surface"
      >
        <Bell size={14} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-lg shadow-red-500/30 animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-80 max-w-[calc(100vw-1.5rem)] max-h-[70vh] overflow-hidden
            bg-surface border border-border rounded-2xl shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold">Мэдэгдэл</h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-[9px] font-bold">
                    {unreadCount} шинэ
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="p-1.5 rounded-lg hover:bg-card-hover transition-all text-on-surface-muted hover:text-on-surface"
                    title="Бүгдийг уншсан болгох"
                  >
                    <CheckCheck size={14} />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-card-hover transition-all text-on-surface-muted hover:text-on-surface"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <PushToggle />

            {/* Notifications list */}
            <div className="overflow-y-auto max-h-[55vh]">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell size={24} className="text-on-surface-muted/20 mx-auto mb-2" />
                  <p className="text-xs text-on-surface-muted">Мэдэгдэл байхгүй</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-border-subtle
                      hover:bg-card-hover transition-all duration-150
                      ${!notif.read ? "bg-accent/[0.03]" : ""}`}
                  >
                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm
                      ${!notif.read ? "bg-accent/15" : "bg-surface-elevated border border-border-subtle"}`}>
                      {notif.icon || "🔔"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-bold truncate ${!notif.read ? "text-on-surface" : "text-on-surface-muted"}`}>
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <div className="w-1.5 h-1.5 bg-accent rounded-full shrink-0" />
                        )}
                      </div>
                      {notif.body && (
                        <p className="text-[10px] text-on-surface-muted mt-0.5 line-clamp-2">
                          {notif.body}
                        </p>
                      )}
                      <p className="text-[9px] text-on-surface-muted/50 mt-1">
                        {timeAgo(notif.createdAt)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
