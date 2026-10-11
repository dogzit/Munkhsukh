"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export type PushState = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// Нэг хуудсан дээр хэд хэдэн компонент ашиглахад төлөвийг хуваалцана
const listeners = new Set<(s: PushState) => void>();
function broadcast(s: PushState) {
  listeners.forEach((l) => l(s));
}

/** Утасны push мэдэгдлийн төлөв, асаах/унтраах */
export function usePush() {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listeners.add(setState);
    let cancelled = false;
    (async () => {
      const supported =
        "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) {
        // iPhone дээр зөвхөн Home Screen-д нэмсэн үед push ажиллана
        if (!cancelled) setState(isIos() && !isStandalone() ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setState("denied");
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
        if (!cancelled) setState(sub ? "on" : "off");
      } catch {
        if (!cancelled) setState("unsupported");
      }
    })();
    return () => {
      cancelled = true;
      listeners.delete(setState);
    };
  }, []);

  const enable = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) {
      toast.error("Push тохируулаагүй байна (VAPID key)");
      return;
    }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        broadcast(permission === "denied" ? "denied" : "off");
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
      broadcast("on");
      toast.success("Утсанд мэдэгдэл ирдэг боллоо 📱");
    } catch {
      toast.error("Мэдэгдэл асаахад алдаа гарлаа");
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
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
      broadcast("off");
      toast.success("Утасны мэдэгдэл унтарлаа");
    } catch {
      toast.error("Алдаа гарлаа");
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable, disable };
}
