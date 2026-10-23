"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Car,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Maximize2,
  Minimize2,
  Trophy,
  Crown,
  Loader2,
  Keyboard,
  OctagonPause,
} from "lucide-react";
import AppHeader from "@/app/_components/AppHeader";
import { useMyRoles } from "@/app/_components/useMyRoles";
import { useGameFullscreen } from "@/app/_components/useGameFullscreen";
import { canPlayCar } from "@/lib/games";
import { H, MODES, W, draw, newGame, score, setBrake, steer, update, type Game, type Mode } from "@/lib/car";

type Phase = "menu" | "countdown" | "playing" | "paused" | "over";

type TopRow = {
  userName: string;
  fullName: string | null;
  avatar: string | null;
  best: number;
  bestTile: number;
};

const DPR = 2;

export default function CarPage() {
  const router = useRouter();
  const { roles } = useMyRoles();
  const allowed = canPlayCar(roles?.role);
  const { full, toggle: toggleFull, exit: exitFull } = useGameFullscreen();

  const [mode, setMode] = useState<Mode>("girl");
  const [phase, setPhase] = useState<Phase>("menu");
  const [result, setResult] = useState<{ score: number; coins: number; dist: number } | null>(null);
  const [tab, setTab] = useState<Mode>("girl");
  const [top, setTop] = useState<Record<Mode, TopRow[] | null>>({ girl: null, boy: null });
  const [myBest, setMyBest] = useState<Record<Mode, number>>({ girl: 0, boy: 0 });
  const [me, setMe] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game>(newGame("girl"));
  const countRef = useRef(0);

  useEffect(() => {
    if (roles && !allowed) router.replace("/");
  }, [roles, allowed, router]);

  const loadTop = useCallback(async (m: Mode) => {
    try {
      const res = await fetch(`/api/games/car-${m}`, { cache: "no-store" });
      if (!res.ok) return;
      const d = (await res.json()) as { top: TopRow[]; myBest: number };
      setTop((t) => ({ ...t, [m]: d.top }));
      setMyBest((b) => ({ ...b, [m]: Math.max(b[m], d.myBest) }));
    } catch { /* */ }
  }, []);

  useEffect(() => {
    try {
      setMe(localStorage.getItem("name") ?? "");
    } catch { /* */ }
    if (!allowed) return;
    loadTop("girl");
    loadTop("boy");
  }, [allowed, loadTop]);

  const ctx = () => {
    const c = canvasRef.current;
    const x = c?.getContext("2d");
    if (x) x.setTransform(DPR, 0, 0, DPR, 0, 0);
    return x ?? null;
  };

  // Тоглоомын давталт — кадр бүрт шинэчилж зурна
  useEffect(() => {
    const c = ctx();
    if (!c) return;
    if (phase === "menu" || phase === "paused") {
      draw(c, gameRef.current);
      return;
    }
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const g = gameRef.current;
      if (phase === "countdown") {
        countRef.current -= dt;
        if (countRef.current <= 0) {
          setPhase("playing");
          return;
        }
      } else {
        update(g, dt);
        if (phase === "playing" && g.over) {
          setResult({ score: score(g), coins: g.coins, dist: Math.round(g.dist / 10) });
          setPhase("over");
        }
      }
      draw(c, g, phase === "countdown" ? countRef.current : 0);
      // Тоглоом дууссаны дараа очнууд унтартал л зурна
      if (phase === "over" && !g.particles.length) return;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase, allowed]);

  // Рекорд хадгалах
  useEffect(() => {
    if (phase !== "over" || !result) return;
    const m = gameRef.current.mode;
    setMyBest((b) => ({ ...b, [m]: Math.max(b[m], result.score) }));
    if (result.score <= myBest[m]) return;
    fetch(`/api/games/car-${m}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ score: result.score, tile: result.coins }),
    })
      .then(() => loadTop(m))
      .catch(() => {});
    // myBest-ийг санаатайгаар оруулаагүй — тоглоом дуусах үед нэг л удаа ажиллана
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, result, loadTop]);

  const start = useCallback((m: Mode) => {
    setMode(m);
    setTab(m);
    gameRef.current = newGame(m);
    countRef.current = 3;
    setResult(null);
    setPhase("countdown");
  }, []);

  const togglePause = useCallback(() => {
    setPhase((p) => (p === "playing" ? "paused" : p === "paused" ? "playing" : p));
  }, []);

  // Өөр таб руу шилжвэл түр зогсоно
  useEffect(() => {
    const onVis = () => document.hidden && setPhase((p) => (p === "playing" ? "paused" : p));
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") {
        e.preventDefault();
        if (phase === "playing") steer(gameRef.current, -1);
      } else if (k === "ArrowRight" || k === "d" || k === "D") {
        e.preventDefault();
        if (phase === "playing") steer(gameRef.current, 1);
      } else if (k === "ArrowDown" || k === "s" || k === "S") {
        e.preventDefault();
        setBrake(gameRef.current, phase === "playing");
      } else if (k === "p" || k === "P" || k === "Escape") {
        togglePause();
      } else if (k === " ") {
        e.preventDefault();
        if (phase === "paused") setPhase("playing");
        else if (phase === "menu") start(mode);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") setBrake(gameRef.current, false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [phase, mode, start, togglePause]);

  // Түр зогсох, дуусах үед тоормос суллагдана
  useEffect(() => {
    if (phase !== "playing") setBrake(gameRef.current, false);
  }, [phase]);

  // Талбарын зүүн/баруун талыг дарахад эгнээ солино
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== "playing") return;
    const r = e.currentTarget.getBoundingClientRect();
    steer(gameRef.current, e.clientX - r.left < r.width / 2 ? -1 : 1);
  };

  if (!roles || !allowed) return <div className="min-h-screen bg-surface" />;

  const rows = top[tab];

  return (
    <div
      className={`${full ? "fixed inset-0 z-[100] overflow-y-auto overscroll-none" : "min-h-screen"}
        bg-surface text-on-surface font-sans select-none [-webkit-touch-callout:none]`}
      style={{ WebkitUserSelect: "none", WebkitTapHighlightColor: "transparent" }}
    >
      {!full && (
        <AppHeader
          title="MASHIN"
          subtitle="Машинуудаас зайлсхий"
          icon={
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shrink-0">
              <Car size={15} className="text-white" />
            </span>
          }
        />
      )}
      {full && (
        <div className="flex items-center justify-between gap-3 px-3 pt-[calc(env(safe-area-inset-top)+10px)] pb-1">
          <p className="text-lg font-black">MASHIN</p>
          <button
            onClick={exitFull}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-elevated border border-border text-xs font-bold active:scale-95"
          >
            <Minimize2 size={14} /> Жижигрүүлэх
          </button>
        </div>
      )}

      <div className="px-3 py-3 sm:p-6">
        <div className="max-w-md lg:max-w-4xl mx-auto lg:flex lg:items-start lg:gap-6">
          <div className="w-full max-w-md mx-auto lg:mx-0 lg:flex-1">
            <div className="flex justify-center">
              <div
                className="relative rounded-3xl overflow-hidden border border-border shadow-2xl bg-black"
                style={{ width: `min(100%, calc((100dvh - ${full ? 205 : 335}px) * ${W} / ${H}))`, minWidth: 220 }}
              >
                <canvas
                  ref={canvasRef}
                  width={W * DPR}
                  height={H * DPR}
                  onPointerDown={onPointerDown}
                  className="block w-full h-auto"
                  style={{ aspectRatio: `${W} / ${H}`, touchAction: "none" }}
                />

                {/* Горим сонгох */}
                {phase === "menu" && (
                  <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 p-5">
                    <p className="text-3xl font-black text-white tracking-tight">MASHIN</p>
                    <p className="text-xs text-white/75 -mt-2 mb-1">Горимоо сонго</p>
                    {(Object.keys(MODES) as Mode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => start(m)}
                        className="w-full max-w-[16rem] rounded-2xl p-3.5 text-left text-white active:scale-[0.97] transition-transform shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${MODES[m].color}, ${m === "girl" ? "#a855f7" : "#0f172a"})` }}
                      >
                        <p className="text-xl font-black">
                          {MODES[m].emoji} {MODES[m].label}
                        </p>
                        <p className="text-[11px] text-white/85 leading-snug mt-0.5">{MODES[m].desc}</p>
                        <p className="text-[10px] text-white/70 mt-1">Рекорд: {myBest[m]}</p>
                      </button>
                    ))}
                  </div>
                )}

                {phase === "paused" && (
                  <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-3">
                    <p className="text-2xl font-black text-white">Түр зогссон</p>
                    <button
                      onClick={() => setPhase("playing")}
                      className="px-5 py-2.5 rounded-2xl bg-white text-black font-black text-sm active:scale-95"
                    >
                      Үргэлжлүүлэх
                    </button>
                  </div>
                )}

                {phase === "over" && result && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 p-5 text-center">
                    <p className="text-3xl font-black text-white">💥 Мөргөлдлөө!</p>
                    <p className="text-sm text-white/80">
                      {MODES[mode].emoji} {MODES[mode].label} горим
                    </p>
                    <p className="text-4xl font-black text-amber-300 tabular-nums mt-1">{result.score}</p>
                    <p className="text-xs text-white/75">
                      {result.dist} м явсан • 🪙 {result.coins} зоос
                    </p>
                    {result.score >= myBest[mode] && result.score > 0 && (
                      <p className="text-sm font-black text-emerald-300">🏆 Шинэ рекорд!</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => start(mode)}
                        className="px-4 py-2.5 rounded-2xl bg-white text-black font-black text-sm active:scale-95"
                      >
                        Дахин
                      </button>
                      <button
                        onClick={() => setPhase("menu")}
                        className="px-4 py-2.5 rounded-2xl bg-white/15 text-white font-black text-sm active:scale-95"
                      >
                        Горим солих
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Удирдлага: ◀ тоормос ▶, доор нь түр зогсоох, томруулах */}
            <div className="mt-3 grid grid-cols-[1fr_1.15fr_1fr] gap-2">
              <button
                aria-label="Зүүн"
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (phase === "playing") steer(gameRef.current, -1);
                }}
                className="h-24 rounded-3xl bg-surface-elevated border border-border flex items-center justify-center active:scale-95 active:bg-card-hover"
                style={{ touchAction: "none" }}
              >
                <ChevronLeft size={44} strokeWidth={2.5} />
              </button>
              <button
                aria-label="Тоормос"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setBrake(gameRef.current, phase === "playing");
                }}
                onPointerUp={() => setBrake(gameRef.current, false)}
                onPointerCancel={() => setBrake(gameRef.current, false)}
                onLostPointerCapture={() => setBrake(gameRef.current, false)}
                onContextMenu={(e) => e.preventDefault()}
                className="h-24 rounded-3xl bg-red-500/15 border border-red-500/40 text-red-400 flex flex-col items-center justify-center gap-0.5 active:scale-95 active:bg-red-500/30"
                style={{ touchAction: "none" }}
              >
                <OctagonPause size={34} />
                <span className="text-xs font-black">ТООРМОС</span>
              </button>
              <button
                aria-label="Баруун"
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (phase === "playing") steer(gameRef.current, 1);
                }}
                className="h-24 rounded-3xl bg-surface-elevated border border-border flex items-center justify-center active:scale-95 active:bg-card-hover"
                style={{ touchAction: "none" }}
              >
                <ChevronRight size={44} strokeWidth={2.5} />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                aria-label={phase === "paused" ? "Үргэлжлүүлэх" : "Түр зогсоох"}
                onClick={togglePause}
                disabled={phase !== "playing" && phase !== "paused"}
                className="h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center gap-1.5 text-xs font-bold disabled:opacity-40 active:scale-95"
              >
                {phase === "paused" ? <Play size={15} /> : <Pause size={15} />}
                {phase === "paused" ? "Үргэлжлүүлэх" : "Зогсоох"}
              </button>
              <button
                aria-label={full ? "Жижигрүүлэх" : "Дэлгэц дүүргэх"}
                onClick={toggleFull}
                className="h-10 rounded-xl bg-accent/15 border border-accent/40 text-accent flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95"
              >
                {full ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                {full ? "Жижиг" : "Томруулах"}
              </button>
            </div>
            <p className="mt-2.5 text-center text-[11px] text-on-surface-muted [@media(pointer:fine)]:hidden">
              Талбарын зүүн/баруун талыг дарж эгнээ соль • 🛑 Тоормосыг дарж байвал удааширна
            </p>

            {!full && (
              <div className="mt-3 hidden [@media(pointer:fine)]:block bg-surface-elevated border border-border rounded-3xl p-4">
                <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-on-surface-muted font-semibold mb-3">
                  <Keyboard size={14} className="text-rose-400" />
                  Товчлуурууд
                </p>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {([
                    [["←", "A"], "Зүүн"],
                    [["→", "D"], "Баруун"],
                    [["↓", "S"], "Тоормос"],
                    [["P", "Esc"], "Түр зогсоох"],
                    [["Space"], "Эхлэх"],
                  ] as [string[], string][]).map(([keys, label]) => (
                    <li key={label} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-on-surface-muted">{label}</span>
                      <span className="flex items-center gap-1">
                        {keys.map((k) => (
                          <kbd
                            key={k}
                            className="min-w-[1.75rem] px-1.5 h-7 inline-flex items-center justify-center rounded-lg
                              bg-surface-alt border border-border border-b-[3px] text-[11px] font-black font-sans"
                          >
                            {k}
                          </kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Ангийн рекорд — горим тус бүрээр */}
          {!full && (
            <aside className="mt-5 lg:mt-0 lg:w-80 lg:shrink-0 bg-surface-elevated border border-border rounded-3xl p-4 shadow-2xl">
              <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-on-surface-muted font-semibold mb-3">
                <Trophy size={14} className="text-amber-400" />
                Ангийн рекорд
              </p>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {(Object.keys(MODES) as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setTab(m)}
                    className={`py-2 rounded-xl text-xs font-black border transition-all ${
                      tab === m ? "text-white border-transparent" : "border-border text-on-surface-muted"
                    }`}
                    style={tab === m ? { background: MODES[m].color } : undefined}
                  >
                    {MODES[m].emoji} {MODES[m].label}
                  </button>
                ))}
              </div>
              {rows === null ? (
                <div className="py-8 flex justify-center">
                  <Loader2 size={18} className="animate-spin text-on-surface-muted" />
                </div>
              ) : rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-on-surface-muted">Одоохондоо оноо алга. Анхны рекордыг тогтоо!</p>
              ) : (
                <ol className="space-y-1.5">
                  {rows.map((r, i) => (
                    <li
                      key={r.userName}
                      className={`flex items-center gap-2.5 rounded-2xl px-2.5 py-2 ${
                        r.userName === me ? "bg-accent/15 border border-accent/30" : "bg-surface-alt/50"
                      }`}
                    >
                      <span className={`w-5 text-center text-xs font-black ${i === 0 ? "text-amber-400" : "text-on-surface-muted"}`}>
                        {i === 0 ? <Crown size={14} className="inline" /> : i + 1}
                      </span>
                      <span className="w-8 h-8 rounded-full overflow-hidden bg-accent/15 flex items-center justify-center text-accent text-xs font-black shrink-0">
                        {r.avatar ? (
                          <img src={r.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (r.fullName || r.userName)[0]?.toUpperCase()
                        )}
                      </span>
                      <span className="flex-1 min-w-0 text-sm font-bold truncate">{r.fullName || r.userName}</span>
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-amber-400/15 text-amber-400 whitespace-nowrap">
                        🪙 {r.bestTile}
                      </span>
                      <span className="text-sm font-black tabular-nums">{r.best}</span>
                    </li>
                  ))}
                </ol>
              )}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
