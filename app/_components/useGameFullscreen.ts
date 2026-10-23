"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Тоглоомыг дэлгэц дүүргэн тоглуулах.
 * Боломжтой бол хөтчийн Fullscreen API-г ашиглана (Android, компьютер),
 * боломжгүй үед (iPhone Safari) хуудсыг бүхэлд нь бүрхэж харуулна.
 */
export function useGameFullscreen() {
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!full) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Хөтчийн fullscreen-ээс Esc-ээр гарвал манай горимоос ч гарна
    const onChange = () => {
      if (!document.fullscreenElement) setFull(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("fullscreenchange", onChange);
    };
  }, [full]);

  const enter = useCallback(() => {
    setFull(true);
    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(() => {});
  }, []);

  const exit = useCallback(() => {
    setFull(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  return { full, enter, exit, toggle: full ? exit : enter };
}
