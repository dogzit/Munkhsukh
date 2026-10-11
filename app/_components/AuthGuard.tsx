"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

function safeGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Messenger/Instagram-ийн дотоод браузерт localStorage алдаа өгч болно
    let storedName: string | null = null;
    try {
      storedName = localStorage.getItem("name");
    } catch {
      /* */
    }

    // 1. Зөвшөөрөгдөх замуудыг тодорхойлно (Эдгээр хуудсан дээр шалгахгүй)
    const publicPaths = ["/auth/login", "/auth/signup"];
    const isPublicPath = publicPaths.includes(pathname);

    if (!storedName) {
      // Хэрэв нэвтрээгүй БӨГӨӨД орох гэж байгаа хуудас нь Public биш бол:
      if (!isPublicPath) {
        router.replace("/auth/login");
        return;
      }
    } else {
      // Хэрэв нэвтэрчихсэн байхад login эсвэл signup руу орох гэж үзвэл:
      if (isPublicPath) {
        // localStorage-д нэр үлдсэн ч cookie хүчингүй болсон байж болно.
        // Шалгахгүйгээр "/" руу явуулбал middleware буцаагаад login руу
        // явуулж, хар дэлгэц дээр эцэс төгсгөлгүй эргэлдэнэ.
        let cancelled = false;
        fetch("/api/profile")
          .then((res) => {
            if (cancelled) return;
            if (res.ok) {
              const target =
                safeGet("role") === "ADMIN" ||
                  storedName!.toLowerCase() === "admin"
                  ? "/admin"
                  : "/";
              router.replace(target);
            } else {
              try {
                localStorage.removeItem("name");
                localStorage.removeItem("role");
              } catch {
                /* */
              }
              setChecking(false);
            }
          })
          .catch(() => {
            if (!cancelled) setChecking(false);
          });
        return () => {
          cancelled = true;
        };
      }
    }

    // Шалгаж дууссан бол агуулгыг харуулна
    setChecking(false);
  }, [router, pathname]);

  // Ямар нэг шалтгаанаар шалгалт гацвал хар дэлгэц дээр үлдээхгүй.
  // Хуудсууд middleware-ээр сервер дээр хамгаалагдсан тул аюулгүй.
  useEffect(() => {
    if (!checking) return;
    const t = setTimeout(() => setChecking(false), 4000);
    return () => clearTimeout(t);
  }, [checking]);

  // Шалгаж дуустал (redirect хийгдэх хооронд) хоосон дэлгэц харуулна
  // Энэ нь нэвтрээгүй хэрэглэгчид админ хуудас "гялс" харагдаад алга болохоос сэргийлнэ.
  if (checking) {
    return <div className="min-h-screen bg-surface" />;
  }

  return <>{children}</>;
}
