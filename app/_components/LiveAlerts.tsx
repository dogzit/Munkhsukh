"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Swords, X as XIcon, Check } from "lucide-react";
import { HEARTBEAT_MS } from "@/lib/presence";

type Alert = { id: string; kind: "invite" | "accepted"; name: string; avatar: string | null };

const SEEN_KEY = "live-alerts-dismissed";

function loadDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

/**
 * Сайт нээлттэй үед "Идэвхтэй" гэж мэдэгдэнэ, мөн X O-ийн дуудлага ирвэл
 * Messenger шиг дэлгэцийн дээд хэсэгт шууд попап гаргана.
 */
export default function LiveAlerts() {
  const router = useRouter();
  const pathname = usePathname();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  // Попап зөвхөн серверийн хариу ирсний дараа гардаг тул hydration зөрөхгүй
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);
  const [busy, setBusy] = useState(false);

  const ping = useCallback(async () => {
    if (document.hidden) return;
    try {
      const res = await fetch("/api/presence", { method: "POST", cache: "no-store" });
      if (!res.ok) return;
      const d = (await res.json()) as { alerts: Alert[] };
      setAlerts(d.alerts ?? []);
    } catch { /* */ }
  }, []);

  useEffect(() => {
    const first = setTimeout(ping, 0);
    const id = setInterval(ping, HEARTBEAT_MS);
    const onVis = () => !document.hidden && ping();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ping]);

  const dismiss = (id: string) => {
    setDismissed((d) => {
      const n = new Set(d).add(id);
      try {
        sessionStorage.setItem(SEEN_KEY, JSON.stringify([...n]));
      } catch { /* */ }
      return n;
    });
  };

  // X O-ийн лобби (дуудлагууд тэнд харагдана) болон тухайн тулааны хуудсан дээр попап хэрэггүй
  const alert =
    pathname === "/xo" ? undefined : alerts.find((a) => !dismissed.has(a.id) && pathname !== `/xo/${a.id}`);

  // Шинэ попап гарахад утсыг бага зэрэг чичрүүлнэ
  const shown = useRef<string | null>(null);
  useEffect(() => {
    if (!alert || shown.current === alert.id) return;
    shown.current = alert.id;
    try {
      navigator.vibrate?.([60, 40, 60]);
    } catch { /* */ }
  }, [alert]);

  if (!alert) return null;

  const open = () => {
    dismiss(alert.id);
    router.push(`/xo/${alert.id}`);
  };
  const accept = async () => {
    setBusy(true);
    try {
      await fetch(`/api/xo/${alert.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
    } catch { /* */ }
    setBusy(false);
    open();
  };

  const invite = alert.kind === "invite";
  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex justify-center px-3 pt-[calc(env(safe-area-inset-top)_+_0.5rem)] pointer-events-none">
      <div
        key={alert.id}
        role="alert"
        data-live-alert
        className="live-alert-in pointer-events-auto w-full max-w-sm rounded-3xl bg-surface-elevated/95 backdrop-blur-xl border border-border shadow-2xl p-3"
      >
        <div className="flex items-center gap-3">
          <button onClick={open} className="relative shrink-0" aria-label="Тулаан руу орох">
            <span className="live-alert-ring block w-12 h-12 rounded-full overflow-hidden bg-accent/15 text-accent font-black flex items-center justify-center">
              {alert.avatar ? <img src={alert.avatar} alt="" className="w-full h-full object-cover" /> : alert.name[0]?.toUpperCase()}
            </span>
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-rose-500 to-sky-500 ring-2 ring-surface-elevated flex items-center justify-center">
              <Swords size={12} className="text-white" />
            </span>
          </button>
          <button onClick={open} className="flex-1 min-w-0 text-left">
            <p className="text-sm font-black truncate">{alert.name}</p>
            <p className="text-xs text-on-surface-muted leading-snug">
              {invite ? "⚔️ чамайг X O тулаанд дуудлаа!" : "✅ дуудлагыг чинь зөвшөөрлөө — чиний ээлж!"}
            </p>
          </button>
          <button
            onClick={() => dismiss(alert.id)}
            aria-label="Хаах"
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-muted hover:bg-card-hover shrink-0 self-start"
          >
            <XIcon size={16} />
          </button>
        </div>
        <div className="mt-2.5 flex gap-2">
          {invite ? (
            <>
              <button
                onClick={() => dismiss(alert.id)}
                className="flex-1 h-10 rounded-2xl border border-border text-xs font-bold active:scale-95"
              >
                Дараа
              </button>
              <button
                onClick={accept}
                disabled={busy}
                className="flex-1 h-10 rounded-2xl bg-emerald-500 text-white text-sm font-black flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Check size={16} /> Тулах!
              </button>
            </>
          ) : (
            <button
              onClick={open}
              className="flex-1 h-10 rounded-2xl bg-accent text-white text-sm font-black active:scale-95"
            >
              Тоглох
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
