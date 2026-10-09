"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Smartphone, Loader2 } from "lucide-react";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const supported =
        "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) {
        // iPhone дээр зөвхөн Home Screen-д нэмсэн үед push ажиллана
        setState(isIos() && !isStandalone() ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          // Сервер дээр бүртгэлтэй эсэхийг баталгаажуулна (жишээ нь өөр хэрэглэгчээр нэвтэрсэн бол)
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(sub.toJSON()),
          }).catch(() => {});
        }
        setState(sub ? "on" : "off");
      } catch {
        setState("unsupported");
      }
    })();
  }, []);

  const enable = async () => {
    if (!VAPID_PUBLIC_KEY) {
      toast.error("Push тохируулаагүй байна (VAPID key)");
      return;
    }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error();
      setState("on");
      toast.success("Утсанд мэдэгдэл ирдэг боллоо 📱");
    } catch {
      toast.error("Мэдэгдэл асаахад алдаа гарлаа");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setState("off");
      toast.success("Утасны мэдэгдэл унтарлаа");
    } catch {
      toast.error("Алдаа гарлаа");
    } finally {
      setBusy(false);
    }
  };

  if (state === "loading" || state === "unsupported") return null;

  return (
    <div className="px-4 py-2.5 border-b border-border flex items-center gap-2.5">
      <Smartphone size={14} className="text-on-surface-muted shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold">Утсанд мэдэгдэл</p>
        <p className="text-[9px] text-on-surface-muted leading-snug">
          {state === "on" && "Энэ төхөөрөмж дээр асаалттай"}
          {state === "off" && "Шинэ даалгавар, мэдээ утсанд ирнэ"}
          {state === "denied" && "Browser-ийн тохиргооноос мэдэгдлийг зөвшөөрнө үү"}
          {state === "ios-install" && "Share → “Add to Home Screen” хийгээд тэндээс нээнэ үү"}
        </p>
      </div>
      {(state === "on" || state === "off") && (
        <button
          onClick={state === "on" ? disable : enable}
          disabled={busy}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all active:scale-95 shrink-0
            ${state === "on"
              ? "bg-surface-alt border-border text-on-surface-muted hover:bg-card-hover"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
            } disabled:opacity-50`}
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : state === "on" ? "Унтраах" : "Асаах"}
        </button>
      )}
    </div>
  );
}
