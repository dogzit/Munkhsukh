"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Gamepad2, Blocks, Car, ChevronRight, Trophy, Lock } from "lucide-react";
import AppHeader from "@/app/_components/AppHeader";
import { useMyRoles } from "@/app/_components/useMyRoles";
import { canPlayBlock, canPlayCar, canPlayGames, gamesClosedUntil } from "@/lib/games";

type Game = {
  id: string;
  name: string;
  desc: string;
  href: string;
  api: string;
  icon: React.ReactNode;
  gradient: string;
  // Картын баруун талын жижиг чимэглэл
  swatches: string[];
};

const GAMES: Game[] = [
  {
    id: "2048",
    name: "2048",
    desc: "Ижил тоог нийлүүлж Шинэковоос Ариун цэвэр дарга хүрэх",
    href: "/game2048",
    api: "/api/games/2048",
    icon: <Gamepad2 size={24} className="text-white" />,
    gradient: "from-amber-400 to-orange-600",
    swatches: ["#fb923c", "#fde047", "#4ade80", "#38bdf8"],
  },
  {
    id: "block",
    name: "BLOCK!!!",
    desc: "Унаж буй дүрсээр мөрөө дүүргэж устга",
    href: "/block",
    api: "/api/games/block",
    icon: <Blocks size={24} className="text-white" />,
    gradient: "from-cyan-400 to-blue-600",
    swatches: ["#22d3ee", "#a855f7", "#ef4444", "#fde047"],
  },
  {
    id: "car",
    name: "MASHIN",
    desc: "Машинуудаас зайлсхийж зоос цуглуул • GIRL / BOY горим",
    href: "/car",
    api: "/api/games/car-girl",
    icon: <Car size={24} className="text-white" />,
    gradient: "from-rose-500 to-orange-500",
    swatches: ["#ec4899", "#3b82f6", "#facc15", "#4caf50"],
  },
];

function canPlay(id: string, role: string | undefined) {
  if (id === "block") return canPlayBlock(role);
  if (id === "car") return canPlayCar(role);
  return canPlayGames(role);
}

/** Бүх тоглоомын нэгдсэн хуудас */
export default function GamesPage() {
  const router = useRouter();
  const { roles } = useMyRoles();
  const [best, setBest] = useState<Record<string, number>>({});

  const visible = GAMES.filter((g) => canPlay(g.id, roles?.role));
  const closed = gamesClosedUntil() !== null && roles?.role !== "ADMIN";

  useEffect(() => {
    if (!roles) return;
    for (const g of GAMES) {
      if (!canPlay(g.id, roles.role)) continue;
      fetch(g.api, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setBest((b) => ({ ...b, [g.id]: d.myBest ?? 0 })))
        .catch(() => {});
    }
  }, [roles]);

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      <AppHeader
        title="Тоглоом"
        subtitle="Ангийнхантайгаа өрсөлд"
        icon={
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center shrink-0">
            <Gamepad2 size={15} className="text-white" />
          </span>
        }
      />

      <div className="px-3 py-4 sm:p-6">
        <div className="max-w-2xl mx-auto grid gap-3 sm:grid-cols-2">
          {!roles
            ? [0, 1].map((i) => (
                <div key={i} className="h-36 rounded-3xl bg-surface-elevated border border-border animate-pulse" />
              ))
            : visible.map((g) => {
                const locked = g.id === "2048" && closed;
                return (
                  <button
                    key={g.id}
                    onClick={() => router.push(g.href)}
                    className="group text-left rounded-3xl bg-surface-elevated border border-border p-4 shadow-2xl
                      hover:bg-card-hover hover:border-accent/30 active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${g.gradient} flex items-center justify-center shadow-lg`}>
                        {g.icon}
                      </span>
                      <span className="grid grid-cols-2 gap-1">
                        {g.swatches.map((c) => (
                          <span key={c} className="w-4 h-4 rounded-[5px]" style={{ background: c }} />
                        ))}
                      </span>
                    </div>
                    <p className="mt-3 text-lg font-black">{g.name}</p>
                    <p className="text-xs text-on-surface-muted leading-snug mt-0.5">{g.desc}</p>
                    <div className="mt-3 flex items-center justify-between">
                      {locked ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                          <Lock size={12} /> Түр хаалттай
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-on-surface-muted">
                          <Trophy size={12} className="text-amber-400" />
                          Миний рекорд: <b className="text-on-surface tabular-nums">{best[g.id] ?? "—"}</b>
                        </span>
                      )}
                      <ChevronRight size={16} className="text-on-surface-muted group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                );
              })}
        </div>
      </div>
    </div>
  );
}
