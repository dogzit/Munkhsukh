"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LogOut, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Гарах баталгаажуулах модал.
 * Баталгаажуулсаны дараа cookie-г устгаад login руу шилжүүлнэ.
 * Зөвхөн "name"-г устгана (theme зэргийг авч үлдэнэ).
 */
export default function LogoutConfirm({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);

  // Escape товчоор хаах
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  if (!open) return null;
  // Анcestor (AppHeader/Sidebar) дээрх backdrop-blur `fixed`-ийг өөрчлдөг тул
  // модалыг шууд body руу portal хийнэ — ингэснээр дэлгэцэн дээр бүрэн харагдана.
  if (typeof document === "undefined") return null;

  const confirmLogout = async () => {
    setLoading(true);
    try {
      // Гарсны дараа энэ төхөөрөмж рүү push ирэхгүй болгоно
      const reg = await navigator.serviceWorker?.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
    } catch {
      // тайван
    }
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // cookie авч чадвал ч редирект хийнэ
    }
    localStorage.removeItem("name");
    localStorage.removeItem("role");
    window.location.href = "/auth/login";
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center
        p-5 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))]
        bg-black/70 backdrop-blur-sm"
      onClick={() => !loading && onClose()}
    >
      <div
        className="w-full max-w-md rounded-[32px] bg-surface-elevated border border-border shadow-2xl
          p-8 sm:p-10 text-on-surface"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "logoutIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
            <LogOut size={34} className="text-red-400" />
          </div>
          <h3 className="text-2xl font-black mb-3">Гарах уу?</h3>
          <p className="text-sm text-on-surface-muted leading-relaxed max-w-[36ch]">
            Та системээс гарахдаа итгэлтэй байна уу? Дахин нэвтрэхэд нэр болон
            PIN шаардлагатай.
          </p>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-4 rounded-2xl bg-surface border border-border text-on-surface-muted
              text-sm font-black uppercase tracking-widest hover:text-on-surface hover:border-accent/30
              transition-all active:scale-95 disabled:opacity-40"
          >
            Болих
          </button>
          <button
            onClick={confirmLogout}
            disabled={loading}
            className="flex-1 py-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400
              text-sm font-black uppercase tracking-widest hover:bg-red-500/25
              transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Гарах
          </button>
        </div>
      </div>

      <style>{`@keyframes logoutIn { from { opacity:0; transform: translateY(16px) scale(0.98); } to { opacity:1; transform: none; } }`}</style>
    </div>,
    document.body,
  );
}
