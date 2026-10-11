"use client";

import { Smartphone, Loader2 } from "lucide-react";
import { usePush } from "./usePush";

export default function PushToggle() {
  const { state, busy, enable, disable } = usePush();

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
