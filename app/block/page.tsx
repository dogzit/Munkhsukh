"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Blocks,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsDown,
  RotateCw,
  Pause,
  Play,
  RotateCcw,
  Trophy,
  Crown,
  Loader2,
  Keyboard,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useGameFullscreen } from "@/app/_components/useGameFullscreen";
import AppHeader from "@/app/_components/AppHeader";
import { useMyRoles } from "@/app/_components/useMyRoles";
import { canPlayBlock } from "@/lib/games";

import {
  CLEAR_MS,
  LOCK_MS,
  MAX_LOCK_MOVES,
  COLORS,
  COLS,
  ROWS,
  SHAPES,
  cellsOf,
  dropDistance,
  fresh,
  grounded,
  reducer,
  speedFor,
  type Action,
  type State,
  type Kind,
} from "@/lib/block";
import { sameName } from "@/lib/names";

const KEYBINDS: [string[], string][] = [
  [["←", "A"], "Зүүн"],
  [["→", "D"], "Баруун"],
  [["↑", "W", "X"], "Эргүүлэх"],
  [["↓", "S"], "Доош"],
  [["Space"], "Шууд унагаах"],
  [["P", "Esc"], "Түр зогсоох"],
];

type TopRow = {
  userName: string;
  fullName: string | null;
  avatar: string | null;
  best: number;
  bestTile: number;
};

/** Tetris-ийн DAS/ARR: эхлээд нэг алхна, DAS хүлээгээд ARR тутамд давтагдана */
const DAS_MS = 150;
const ARR_MS = 40;
const SOFT_MS = 35;

/** Дарж байх хугацаандаа давтагддаг товч (зүүн/баруун/доош) */
function HoldButton({
  onFire,
  repeat = true,
  delay = DAS_MS,
  rate = ARR_MS,
  label,
  children,
  className = "",
}: {
  onFire: () => void;
  repeat?: boolean;
  delay?: number;
  rate?: number;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const fire = useRef(onFire);
  useEffect(() => {
    fire.current = onFire;
  });
  const timers = useRef<{ t?: ReturnType<typeof setTimeout>; i?: ReturnType<typeof setInterval> }>({});
  const [down, setDown] = useState(false);
  const stop = useCallback(() => {
    clearTimeout(timers.current.t);
    clearInterval(timers.current.i);
    timers.current = {};
    setDown(false);
  }, []);
  useEffect(() => stop, [stop]);
  const start = () => {
    stop();
    setDown(true);
    fire.current();
    if (repeat) {
      timers.current.t = setTimeout(() => {
        timers.current.i = setInterval(() => fire.current(), rate);
      }, delay);
    }
  };
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        // Хуруу товчноос бага зэрэг гулсаад ч давталт тасрахгүй
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch { /* */ }
        start();
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onContextMenu={(e) => e.preventDefault()}
      className={`h-14 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center
        select-none transition-transform ${down ? "scale-95 bg-card-hover" : ""} ${className}`}
      style={{ touchAction: "none", WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
    >
      {children}
    </button>
  );
}

function Cell({ k, ghost, clearing, col }: { k: Kind | null; ghost?: Kind | null; clearing?: boolean; col: number }) {
  if (k) {
    return (
      <div
        className={`rounded-[3px] ${clearing ? "block-clear" : ""}`}
        style={{
          background: COLORS[k],
          boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.25), inset 0 2px 0 rgba(255,255,255,0.4)",
          // Мөр голоосоо хоёр тийш арилна
          animationDelay: clearing ? `${Math.abs(col - 4.5) * 22}ms` : undefined,
        }}
      />
    );
  }
  if (ghost) {
    return <div className="rounded-[3px]" style={{ boxShadow: `inset 0 0 0 2px ${COLORS[ghost]}88` }} />;
  }
  return (
    <div
      className="rounded-[3px]"
      style={{ background: "color-mix(in oklab, var(--color-on-surface) 5%, transparent)" }}
    />
  );
}

const BLOCK_SAVE_KEY = "block-save-v1";

/** Хадгалсан тоглоомоо унших — эвдэрсэн/дууссан бол хоосон эхлэл буцаана */
function loadSaved(): State {
  try {
    const raw = localStorage.getItem(BLOCK_SAVE_KEY);
    if (!raw) return fresh(false);
    const saved = JSON.parse(raw) as State;
    if (!saved.started || saved.over) return fresh(false);
    // Дэлгэц дахин ачаалахад тоглоом гэнэт үргэлжлэхгүй — түр зогссон хэвээр нээгдэнэ
    return { ...saved, paused: true, clearing: null };
  } catch {
    return fresh(false);
  }
}

export default function BlockPage() {
  const router = useRouter();
  const { roles } = useMyRoles();
  const allowed = canPlayBlock(roles?.role);
  const { full, toggle: toggleFull, exit: exitFull } = useGameFullscreen();

  const [s, dispatch] = useReducer(reducer, undefined, loadSaved);
  const [myBest, setMyBest] = useState(0);
  const [top, setTop] = useState<TopRow[] | null>(null);
  const [me, setMe] = useState("");
  const submitted = useRef(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number; t: number; sx: number; sy: number; acted: boolean } | null>(null);

  useEffect(() => {
    if (roles && !allowed) router.replace("/");
  }, [roles, allowed, router]);

  const loadTop = useCallback(async () => {
    try {
      const res = await fetch("/api/games/block", { cache: "no-store" });
      if (!res.ok) return;
      const d = (await res.json()) as { top: TopRow[]; myBest: number };
      setTop(d.top);
      setMyBest((b) => Math.max(b, d.myBest));
      submitted.current = Math.max(submitted.current, d.myBest);
    } catch { /* */ }
  }, []);

  useEffect(() => {
    try {
      setMe(localStorage.getItem("name") ?? "");
    } catch { /* */ }
    if (allowed) loadTop();
  }, [allowed, loadTop]);

  // Унах хурд түвшингээр нэмэгдэнэ
  useEffect(() => {
    if (!s.started || s.over || s.paused) return;
    const id = setInterval(() => dispatch({ type: "tick" }), speedFor(s.level));
    return () => clearInterval(id);
  }, [s.started, s.over, s.paused, s.level]);

  // Газардсан дүрс LOCK_MS хүлээгээд тогтоно — хөдөлгөх/эргүүлэх бүрт хугацаа шинэчлэгдэнэ
  const isGrounded = s.started && !s.over && !s.paused && !s.clearing && grounded(s);
  useEffect(() => {
    if (!isGrounded) return;
    const t = setTimeout(() => dispatch({ type: "lock" }), s.lockMoves >= MAX_LOCK_MOVES ? 0 : LOCK_MS);
    return () => clearTimeout(t);
  }, [isGrounded, s.piece, s.lockMoves]);

  // Мөр гялсхийж дуусахад устгана
  useEffect(() => {
    if (!s.clearing) return;
    const t = setTimeout(() => dispatch({ type: "finishClear" }), CLEAR_MS);
    return () => clearTimeout(t);
  }, [s.clearing]);

  // Өөр таб руу шилжвэл түр зогсоно
  useEffect(() => {
    const onVis = () => document.hidden && dispatch({ type: "pause", value: true });
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Тоглоом дуусахад рекордыг хадгална
  useEffect(() => {
    if (!s.over || !allowed || s.score <= submitted.current) return;
    submitted.current = s.score;
    fetch("/api/games/block", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ score: s.score, tile: s.lines }),
    })
      .then(() => loadTop())
      .catch(() => {});
  }, [s.over, s.score, s.lines, allowed, loadTop]);

  // Pause хийгээд хуудаснаас гарсан ч, буцаж ороход яг тэр байдлаараа үргэлжилнэ
  useEffect(() => {
    try {
      if (s.started && !s.over) localStorage.setItem(BLOCK_SAVE_KEY, JSON.stringify(s));
      else localStorage.removeItem(BLOCK_SAVE_KEY);
    } catch { /* */ }
  }, [s]);

  // Гар: үйлдлийн системийн удаан давталтын оронд Tetris шиг DAS/ARR
  const keyTimers = useRef(new Map<string, { t?: ReturnType<typeof setTimeout>; i?: ReturnType<typeof setInterval> }>());
  useEffect(() => {
    const timers = keyTimers.current;
    const release = (code: string) => {
      const h = timers.get(code);
      if (!h) return;
      clearTimeout(h.t);
      clearInterval(h.i);
      timers.delete(code);
    };
    const hold = (code: string, a: Action, delay: number, rate: number) => {
      release(code);
      dispatch(a);
      const h: { t?: ReturnType<typeof setTimeout>; i?: ReturnType<typeof setInterval> } = {};
      h.t = setTimeout(() => (h.i = setInterval(() => dispatch(a), rate)), delay);
      timers.set(code, h);
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const k = e.key;
      const left = k === "ArrowLeft" || k === "a" || k === "A";
      const right = k === "ArrowRight" || k === "d" || k === "D";
      const softKey = k === "ArrowDown" || k === "s" || k === "S";
      if (left || right || softKey) {
        e.preventDefault();
        if (e.repeat) return;
        if (left) {
          release("R");
          hold("L", { type: "move", dx: -1 }, DAS_MS, ARR_MS);
        } else if (right) {
          release("L");
          hold("R", { type: "move", dx: 1 }, DAS_MS, ARR_MS);
        } else hold("D", { type: "soft" }, SOFT_MS, SOFT_MS);
        return;
      }
      let a: Action | null = null;
      if (k === "ArrowUp" || k === "w" || k === "W" || k === "x" || k === "X") a = { type: "rotate" };
      // Тоглоом дууссаны дараа Space-ээр шууд дахин эхлэхгүй (санамсаргүй дарагдахаас сэргийлнэ)
      else if (k === " ") a = !s.started ? { type: "start" } : s.over ? null : { type: "hard" };
      else if (k === "p" || k === "P" || k === "Escape") a = { type: "pause" };
      if (k === " ") e.preventDefault();
      if (!a) return;
      e.preventDefault();
      // Эргүүлэх, унагаахыг барьж байхад давтахгүй
      if (e.repeat && a.type !== "pause") return;
      dispatch(a);
    };
    const onUp = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") release("L");
      else if (k === "ArrowRight" || k === "d" || k === "D") release("R");
      else if (k === "ArrowDown" || k === "s" || k === "S") release("D");
    };
    const releaseAll = () => [...timers.keys()].forEach(release);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", releaseAll);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", releaseAll);
      releaseAll();
    };
  }, [s.started, s.over]);

  // Талбар дээр: хажуу тийш чирэхэд хөдөлнө, товшвол эргэнэ, доош хурдан шударвал шууд унана
  const cellPx = () => (boardRef.current?.clientWidth ?? 250) / COLS;
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, t: Date.now(), sx: 0, sy: 0, acted: false };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const st = touch.current;
    if (!st) return;
    const t = e.touches[0];
    const px = cellPx();
    const stepX = Math.trunc((t.clientX - st.x) / px);
    while (st.sx < stepX) { dispatch({ type: "move", dx: 1 }); st.sx++; st.acted = true; }
    while (st.sx > stepX) { dispatch({ type: "move", dx: -1 }); st.sx--; st.acted = true; }
    const stepY = Math.max(0, Math.trunc((t.clientY - st.y) / px));
    while (st.sy < stepY) { dispatch({ type: "soft" }); st.sy++; st.acted = true; }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const st = touch.current;
    touch.current = null;
    if (!st) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - st.x;
    const dy = t.clientY - st.y;
    const dt = Date.now() - st.t;
    if (dy > cellPx() * 2.5 && dt < 260 && Math.abs(dy) > Math.abs(dx) * 1.5) dispatch({ type: "hard" });
    else if (!st.acted && Math.hypot(dx, dy) < 12 && dt < 300) dispatch({ type: "rotate" });
  };

  if (!roles || !allowed) return <div className="min-h-screen bg-surface" />;

  // Харагдах талбар: тогтсон блок + сүүдэр + унаж буй дүрс
  const view: (Kind | null)[] = [...s.board];
  const ghost: (Kind | null)[] = Array(COLS * ROWS).fill(null);
  if (s.started && !s.over && !s.clearing) {
    const d = dropDistance(s.board, s.piece);
    for (const [r, c] of cellsOf({ ...s.piece, y: s.piece.y + d })) if (r >= 0) ghost[r * COLS + c] = s.piece.k;
    for (const [r, c] of cellsOf(s.piece)) if (r >= 0) view[r * COLS + c] = s.piece.k;
  }

  const nextShape = SHAPES[s.next].filter((row) => row.some(Boolean));

  return (
    <div
      className={`${full ? "fixed inset-0 z-[100] overflow-y-auto overscroll-none" : "min-h-screen"}
        bg-surface text-on-surface font-sans select-none [-webkit-touch-callout:none]`}
      style={{ WebkitUserSelect: "none", WebkitTapHighlightColor: "transparent" }}
    >
      <style>{`
        @keyframes block-clear {
          0% { filter: brightness(1); transform: scale(1); }
          35% { filter: brightness(2.4); background: #ffffff; transform: scale(1.08); }
          100% { filter: brightness(2); background: #ffffff; transform: scale(0); opacity: 0; }
        }
        .block-clear { animation: block-clear ${CLEAR_MS}ms ease-in forwards; }
        @keyframes block-flash {
          0% { opacity: 0; transform: scaleX(0.1); }
          40% { opacity: 0.95; transform: scaleX(1); }
          100% { opacity: 0; transform: scaleX(1.05); }
        }
        .block-flash {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.95), rgba(34,211,238,0.9), rgba(255,255,255,0.95), transparent);
          box-shadow: 0 0 18px 4px rgba(34,211,238,0.7);
          animation: block-flash ${CLEAR_MS}ms ease-out forwards;
        }
        @keyframes block-popup {
          0% { opacity: 0; transform: translateY(12px) scale(0.6); }
          18% { opacity: 1; transform: translateY(0) scale(1.12); }
          30% { transform: scale(1); }
          75% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-36px) scale(1); }
        }
        .block-popup { animation: block-popup 1100ms ease-out forwards; }
        .block-popup-big { animation-duration: 1500ms; }
        @keyframes block-shake {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(-5px, 2px); }
          40% { transform: translate(5px, -2px); }
          60% { transform: translate(-3px, 1px); }
          80% { transform: translate(3px, 0); }
        }
        .block-shake { animation: block-shake 360ms ease-in-out; }
      `}</style>
      {!full && <AppHeader
        title="BLOCK!!!"
        subtitle="Мөрөө дүүргэж устга"
        icon={
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shrink-0">
            <Blocks size={15} className="text-white" />
          </span>
        }
      />}
      {full && (
        <div className="flex items-center justify-between gap-3 px-3 pt-[calc(env(safe-area-inset-top)+10px)] pb-1">
          <p className="text-lg font-black">BLOCK!!!</p>
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
            <div className="flex gap-2.5 items-start">
              {/* Талбар */}
              <div className="flex-1 min-w-0 flex justify-center">
                <div
                  ref={boardRef}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  key={s.popup?.lines === 4 ? `shake${s.popup.id}` : "board"}
                  className={`relative aspect-[1/2] rounded-2xl bg-surface-elevated border border-border p-1 shadow-2xl select-none ${
                    s.popup?.lines === 4 ? "block-shake" : ""
                  }`}
                  style={{ width: `min(100%, calc((100dvh - ${full ? 200 : 330}px) / 2))`, minWidth: 180, touchAction: "none" }}
                >
                  <div className="grid h-full gap-[2px]" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                    {view.map((k, i) => (
                      <Cell
                        key={i}
                        k={k}
                        ghost={ghost[i]}
                        col={i % COLS}
                        clearing={!!s.clearing?.includes(Math.floor(i / COLS))}
                      />
                    ))}
                  </div>

                  {/* Устах мөрүүд дээгүүр гэрэл гүйнэ */}
                  {s.clearing?.map((r) => (
                    <div
                      key={`flash${r}`}
                      className="block-flash pointer-events-none absolute left-1 right-1 rounded-[3px]"
                      style={{ top: `calc(4px + ${r} * (100% - 8px) / ${ROWS})`, height: `calc((100% - 8px) / ${ROWS})` }}
                    />
                  ))}

                  {/* +оноо бичиг */}
                  {s.popup && (
                    <div
                      key={s.popup.id}
                      className={`block-popup pointer-events-none absolute inset-x-0 top-[38%] z-[5] text-center ${
                        s.popup.lines === 4 ? "block-popup-big" : ""
                      }`}
                    >
                      <p
                        className="font-black tracking-tight text-white"
                        style={{
                          fontSize: s.popup.lines === 4 ? "2rem" : "1.4rem",
                          textShadow: "0 0 12px rgba(34,211,238,0.9), 0 2px 0 rgba(0,0,0,0.5)",
                        }}
                      >
                        {s.popup.label}
                      </p>
                      <p className="text-sm font-black text-amber-300" style={{ textShadow: "0 1px 0 rgba(0,0,0,0.6)" }}>
                        +{s.popup.pts}
                      </p>
                    </div>
                  )}

                  {(!s.started || s.over || s.paused) && (
                    <div className="absolute inset-0 z-10 rounded-2xl bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 p-4 text-center">
                      <p className="text-2xl font-black text-white">
                        {s.over ? "Тоглоом дууслаа" : s.paused ? "Түр зогссон" : "BLOCK!!!"}
                      </p>
                      {s.over && (
                        <p className="text-sm text-white/80">
                          Оноо: <b className="text-amber-300">{s.score}</b> • {s.lines} мөр
                        </p>
                      )}
                      <button
                        onClick={() => dispatch(s.paused && !s.over ? { type: "pause", value: false } : { type: "start" })}
                        className="px-5 py-2.5 rounded-2xl bg-white text-black font-black text-sm active:scale-95"
                      >
                        {s.over ? "Дахин тоглох" : s.paused ? "Үргэлжлүүлэх" : "Эхлэх"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Хажуугийн мэдээлэл */}
              <div className="w-[84px] shrink-0 space-y-2">
                <div className="bg-surface-elevated border border-border rounded-2xl p-2">
                  <p className="text-[9px] uppercase tracking-widest text-on-surface-muted font-semibold">Дараагийн</p>
                  <div className="mt-1.5 h-12 flex items-center justify-center">
                    <div
                      className="grid gap-[2px]"
                      style={{ gridTemplateColumns: `repeat(${nextShape[0].length}, 14px)` }}
                    >
                      {nextShape.flat().map((v, i) => (
                        <div
                          key={i}
                          className="w-[14px] h-[14px] rounded-[3px]"
                          style={v ? { background: COLORS[s.next], boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.25)" } : undefined}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {[
                  ["Оноо", s.score],
                  ["Рекорд", Math.max(myBest, s.score)],
                  ["Мөр", s.lines],
                  ["Түвшин", s.level + 1],
                ].map(([label, v]) => (
                  <div key={label} className="bg-surface-elevated border border-border rounded-2xl px-2 py-1.5">
                    <p className="text-[9px] uppercase tracking-widest text-on-surface-muted font-semibold">{label}</p>
                    <p className={`text-base font-black tabular-nums truncate ${label === "Рекорд" ? "text-amber-400" : ""}`}>{v}</p>
                  </div>
                ))}
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <button
                    onClick={() => dispatch({ type: "pause" })}
                    disabled={!s.started || s.over}
                    aria-label={s.paused ? "Үргэлжлүүлэх" : "Түр зогсоох"}
                    className="h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center gap-1.5 text-xs font-bold disabled:opacity-40 active:scale-95"
                  >
                    {s.paused ? <Play size={15} /> : <Pause size={15} />}
                    {s.paused ? "Үргэлжлүүлэх" : "Түр зогсоох"}
                  </button>
                  <button
                    onClick={() => {
                      // Тоглоом явж байхад санаандгүй дарж рекордоо алдахаас хамгаална
                      if (s.started && !s.over && !confirm("Одоогийн тоглоомоо шинээр эхлэх үү?")) return;
                      dispatch({ type: "start" });
                    }}
                    aria-label="Шинээр эхлэх"
                    className="h-10 w-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center active:scale-95"
                  >
                    <RotateCcw size={15} />
                  </button>
                  <button
                    onClick={toggleFull}
                    aria-label={full ? "Жижигрүүлэх" : "Дэлгэц дүүргэх"}
                    className="col-span-2 h-10 rounded-xl bg-accent/15 border border-accent/40 text-accent flex items-center justify-center gap-1.5 text-[11px] font-black active:scale-95"
                  >
                    {full ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    {full ? "Жижиг" : "Томруулах"}
                  </button>
                </div>
              </div>
            </div>

            {/* Удирдлагын товчнууд */}
            <div className="mt-3 grid grid-cols-5 gap-2">
              <HoldButton label="Зүүн" onFire={() => dispatch({ type: "move", dx: -1 })}>
                <ChevronLeft size={24} />
              </HoldButton>
              <HoldButton label="Баруун" onFire={() => dispatch({ type: "move", dx: 1 })}>
                <ChevronRight size={24} />
              </HoldButton>
              <HoldButton label="Эргүүлэх" repeat={false} onFire={() => dispatch({ type: "rotate" })} className="bg-accent/15 border-accent/40">
                <RotateCw size={22} className="text-accent" />
              </HoldButton>
              <HoldButton label="Доош" delay={SOFT_MS} rate={SOFT_MS} onFire={() => dispatch({ type: "soft" })}>
                <ChevronDown size={24} />
              </HoldButton>
              <HoldButton label="Шууд унагаах" repeat={false} onFire={() => dispatch({ type: "hard" })}>
                <ChevronsDown size={24} />
              </HoldButton>
            </div>
            <p className="mt-2.5 text-center text-[11px] text-on-surface-muted [@media(pointer:fine)]:hidden">
              Талбар дээр: чирж хөдөлгөх • товшиж эргүүлэх • доош шударч унагаах
            </p>

            {/* MacBook / notebook-ийн товчлуурууд — хулганатай төхөөрөмжид харагдана */}
            <div className={`mt-3 hidden ${full ? "" : "[@media(pointer:fine)]:block"} bg-surface-elevated border border-border rounded-3xl p-4`}>
              <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-on-surface-muted font-semibold mb-3">
                <Keyboard size={14} className="text-cyan-400" />
                Товчлуурууд
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {KEYBINDS.map(([keys, label]) => (
                  <li key={label} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-on-surface-muted">{label}</span>
                    <span className="flex items-center gap-1">
                      {keys.map((k, i) => (
                        <span key={k} className="flex items-center gap-1">
                          {i > 0 && <span className="text-[10px] text-on-surface-muted">/</span>}
                          <kbd
                            className="min-w-[1.75rem] px-1.5 h-7 inline-flex items-center justify-center rounded-lg
                              bg-surface-alt border border-border border-b-[3px] text-[11px] font-black font-sans"
                          >
                            {k}
                          </kbd>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Ангийн рекорд */}
          {!full && <aside className="mt-5 lg:mt-0 lg:w-80 lg:shrink-0 bg-surface-elevated border border-border rounded-3xl p-4 shadow-2xl">
            <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-on-surface-muted font-semibold mb-3">
              <Trophy size={14} className="text-amber-400" />
              Ангийн рекорд
            </p>
            {top === null ? (
              <div className="py-8 flex justify-center">
                <Loader2 size={18} className="animate-spin text-on-surface-muted" />
              </div>
            ) : top.length === 0 ? (
              <p className="py-6 text-center text-sm text-on-surface-muted">Одоохондоо оноо алга. Анхны рекордыг тогтоо!</p>
            ) : (
              <ol className="space-y-1.5">
                {top.map((r, i) => (
                  <li
                    key={r.userName}
                    className={`flex items-center gap-2.5 rounded-2xl px-2.5 py-2 ${
                      sameName(r.userName, me) ? "bg-accent/15 border border-accent/30" : "bg-surface-alt/50"
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
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-cyan-400/15 text-cyan-400 whitespace-nowrap">
                      {r.bestTile} мөр
                    </span>
                    <span className="text-sm font-black tabular-nums">{r.best}</span>
                  </li>
                ))}
              </ol>
            )}
          </aside>}
        </div>
      </div>
    </div>
  );
}
