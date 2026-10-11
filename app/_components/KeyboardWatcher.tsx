"use client";

import { useEffect } from "react";

const TEXT_INPUT = /^(text|search|email|tel|url|password|number|)$/;

function isTextField(el: EventTarget | null) {
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) return TEXT_INPUT.test(el.type);
  return el instanceof HTMLElement && el.isContentEditable;
}

/**
 * Утсан дээр бичих талбар сонгогдож keyboard нээгдэхэд <html>-д `kb-open`
 * класс нэмнэ. Ингэснээр доод цэс нуугдаж, чатын бичих талбар keyboard-ын
 * яг дээр наалдана (өмнө нь цэсний өндрөөр зай гарч мессеж дээр давхцдаг байсан).
 */
export default function KeyboardWatcher() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const html = document.documentElement;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onFocusIn = (e: FocusEvent) => {
      if (!isTextField(e.target)) return;
      clearTimeout(timer);
      html.classList.add("kb-open");
    };
    // Нэг талбараас нөгөө рүү шилжихэд анивчихгүйн тулд бага зэрэг хүлээнэ
    const onFocusOut = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!isTextField(document.activeElement)) html.classList.remove("kb-open");
      }, 100);
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      html.classList.remove("kb-open");
    };
  }, []);

  return null;
}
