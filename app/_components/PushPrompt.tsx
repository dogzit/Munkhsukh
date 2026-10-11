"use client";

import { useState } from "react";
import { BellRing, Loader2, Share, SquarePlus, X } from "lucide-react";
import { usePush } from "./usePush";

const DISMISS_KEY = "push-prompt-dismissed-at";
// Хаасны дараа 2 хоногийн дараа дахин санал болгоно
const DISMISS_MS = 2 * 24 * 60 * 60 * 1000;

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - at < DISMISS_MS;
  } catch {
    return false;
  }
}

/** Утсанд мэдэгдэл асаагаагүй хүнд ил харагдах санал */
export default function PushPrompt() {
  const { state, busy, enable } = usePush();
  const [hidden, setHidden] = useState(dismissedRecently);

  if (hidden || (state !== "off" && state !== "ios-install" && state !== "denied")) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch { /* */ }
    setHidden(true);
  };

  return (
    <div
      className="push-prompt fixed inset-x-2 z-30 bottom-[calc(4.25rem_+_env(safe-area-inset-bottom))]
        lg:bottom-4 lg:left-auto lg:right-4 lg:w-96"
    >
      <div className="rounded-3xl border border-accent/30 bg-surface/95 backdrop-blur-xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 shrink-0 rounded-2xl bg-accent/15 flex items-center justify-center">
            <BellRing size={18} className="text-accent" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm">Чатын мессеж утсанд ирдэг болго</p>
            <p className="text-[11px] text-on-surface-muted leading-snug mt-0.5">
              {state === "off" && "Чат, даалгавар, мэдээ Instagram шиг шууд утсанд чинь ирнэ."}
              {state === "denied" &&
                "Мэдэгдэл хаагдсан байна. Утасны Settings → (Safari/Chrome эсвэл 11A) → Notifications-ийг асаана уу."}
              {state === "ios-install" && "iPhone дээр эхлээд сайтыг Home Screen-д нэмэх хэрэгтэй:"}
            </p>
          </div>
          <button onClick={dismiss} aria-label="Хаах" className="p-1 -m-1 rounded-lg hover:bg-card-hover shrink-0">
            <X size={16} className="text-on-surface-muted" />
          </button>
        </div>

        {state === "ios-install" && (
          <ol className="mt-3 space-y-1.5 text-xs">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-black flex items-center justify-center">1</span>
              Safari-ийн доод талын <Share size={14} className="text-sky-400" /> <b>Share</b> товч
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-black flex items-center justify-center">2</span>
              <SquarePlus size={14} /> <b>Add to Home Screen</b> → Add
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-black flex items-center justify-center">3</span>
              Home Screen дээрх <b>11A</b> дүрсээр нээгээд энд “Асаах” дар
            </li>
          </ol>
        )}

        {state === "off" && (
          <button onClick={enable} disabled={busy}
            className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent text-white text-sm font-black
              hover:opacity-90 active:scale-[0.98] disabled:opacity-50">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <BellRing size={15} />}
            Мэдэгдэл асаах
          </button>
        )}
      </div>
    </div>
  );
}
