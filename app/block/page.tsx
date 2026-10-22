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
} from "lucide-react";
import AppHeader from "@/app/_components/AppHeader";
import { useMyRoles } from "@/app/_components/useMyRoles";
import { canPlayBlock } from "@/lib/games";

const COLS = 10;
const ROWS = 20;

type Kind = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
const KINDS: Kind[] = ["I", "O", "T", "S", "Z", "J", "L"];

const SHAPES: Record<Kind, number[][]> = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
};

// Дүрс бүр өөрийн энгийн тод өнгөтэй
const COLORS: Record<Kind, string> = {
  I: "#22d3ee",
  O: "#fde047",
  T: "#a855f7",
  S: "#4ade80",
  Z: "#ef4444",
  J: "#3b82f6",
  L: "#fb923c",
};

const LINE_POINTS = [0, 100, 300, 500, 800];

type Piece = { k: Kind; m: number[][]; x: number; y: number };

type State = {
  board: (Kind | null)[];
  piece: Piece;
  next: Kind;
  bag: Kind[];
  score: number;
  lines: number;
  level: number;
  over: boolean;
  paused: boolean;
  started: boolean;
};

type Action =
  | { type: "move"; dx: number }
  | { type: "rotate" }
  | { type: "soft" }
  | { type: "hard" }
  | { type: "tick" }
  | { type: "pause"; value?: boolean }
  | { type: "start" };

function shuffled(): Kind[] {
  const a = [...KINDS];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 7 дүрсийг холиод дарааллаар нь гаргана — нэг дүрс удаан гарахгүй байх асуудалгүй */
function draw(bag: Kind[]): [Kind, Kind[]] {
  const b = bag.length ? bag : shuffled();
  return [b[0], b.slice(1)];
}

function spawn(k: Kind): Piece {
  const m = SHAPES[k];
  return { k, m, x: Math.floor((COLS - m.length) / 2), y: k === "I" ? -1 : 0 };
}

function cellsOf(p: Piece): [number, number][] {
  const out: [number, number][] = [];
  p.m.forEach((row, r) => row.forEach((v, c) => v && out.push([p.y + r, p.x + c])));
  return out;
}

function fits(board: (Kind | null)[], p: Piece) {
  return cellsOf(p).every(([r, c]) => c >= 0 && c < COLS && r < ROWS && (r < 0 || !board[r * COLS + c]));
}

function rotateCW(m: number[][]) {
  const n = m.length;
  return m.map((row, r) => row.map((_, c) => m[n - 1 - c][r]));
}

function dropDistance(board: (Kind | null)[], p: Piece) {
  let d = 0;
  while (fits(board, { ...p, y: p.y + d + 1 })) d++;
  return d;
}

function fresh(started: boolean): State {
  const [k, bag1] = draw([]);
  const [next, bag] = draw(bag1);
  return {
    board: Array(COLS * ROWS).fill(null),
    piece: spawn(k),
    next,
    bag,
    score: 0,
    lines: 0,
    level: 0,
    over: false,
    paused: false,
    started,
  };
}

/** Дүрсийг байранд нь тогтоож, дүүрсэн мөрүүдийг устгаад дараагийн дүрсийг гаргана */
function lock(s: State, piece: Piece, bonus = 0): State {
  const board = [...s.board];
  let overTop = false;
  for (const [r, c] of cellsOf(piece)) {
    if (r < 0) overTop = true;
    else board[r * COLS + c] = piece.k;
  }

  const kept: (Kind | null)[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const row = board.slice(r * COLS, r * COLS + COLS);
    if (!row.every(Boolean)) kept.push(row);
  }
  const cleared = ROWS - kept.length;
  const newBoard = [...Array.from({ length: cleared }, () => Array(COLS).fill(null)), ...kept].flat();

  const lines = s.lines + cleared;
  const score = s.score + bonus + LINE_POINTS[cleared] * (s.level + 1);
  const level = Math.floor(lines / 10);
  const nextPiece = spawn(s.next);
  const [next, bag] = draw(s.bag);
  const over = overTop || !fits(newBoard, nextPiece);

  return { ...s, board: newBoard, piece: nextPiece, next, bag, score, lines, level, over };
}

function reducer(s: State, a: Action): State {
  if (a.type === "start") return fresh(true);
  if (a.type === "pause") {
    if (!s.started || s.over) return s;
    return { ...s, paused: a.value ?? !s.paused };
  }
  if (!s.started || s.over || s.paused) return s;

  switch (a.type) {
    case "move": {
      const p = { ...s.piece, x: s.piece.x + a.dx };
      return fits(s.board, p) ? { ...s, piece: p } : s;
    }
    case "rotate": {
      if (s.piece.k === "O") return s;
      const m = rotateCW(s.piece.m);
      // Хананд наалдсан үед хажуу тийш түлхэж эргүүлнэ
      for (const dx of [0, -1, 1, -2, 2]) {
        const p = { ...s.piece, m, x: s.piece.x + dx };
        if (fits(s.board, p)) return { ...s, piece: p };
      }
      return s;
    }
    case "soft":
    case "tick": {
      const p = { ...s.piece, y: s.piece.y + 1 };
      if (fits(s.board, p)) return { ...s, piece: p, score: s.score + (a.type === "soft" ? 1 : 0) };
      return lock(s, s.piece);
    }
    case "hard": {
      const d = dropDistance(s.board, s.piece);
      return lock(s, { ...s.piece, y: s.piece.y + d }, d * 2);
    }
  }
  return s;
}

function speedFor(level: number) {
  return Math.max(90, 800 - level * 70);
}

type TopRow = {
  userName: string;
  fullName: string | null;
  avatar: string | null;
  best: number;
  bestTile: number;
};

/** Дарж байх хугацаандаа давтагддаг товч (зүүн/баруун/доош) */
function HoldButton({
  onFire,
  repeat = true,
  label,
  children,
  className = "",
}: {
  onFire: () => void;
  repeat?: boolean;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const timers = useRef<{ t?: ReturnType<typeof setTimeout>; i?: ReturnType<typeof setInterval> }>({});
  const stop = () => {
    clearTimeout(timers.current.t);
    clearInterval(timers.current.i);
  };
  useEffect(() => stop, []);
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        onFire();
        if (repeat) timers.current.t = setTimeout(() => (timers.current.i = setInterval(onFire, 55)), 170);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      className={`h-14 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center
        active:scale-95 active:bg-card-hover select-none ${className}`}
      style={{ touchAction: "none" }}
    >
      {children}
    </button>
  );
}

function Cell({ k, ghost }: { k: Kind | null; ghost?: Kind | null }) {
  if (k) {
    return (
      <div
        className="rounded-[3px]"
        style={{
          background: COLORS[k],
          boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.25), inset 0 2px 0 rgba(255,255,255,0.4)",
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

export default function BlockPage() {
  const router = useRouter();
  const { roles } = useMyRoles();
  const allowed = canPlayBlock(roles?.role);

  const [s, dispatch] = useReducer(reducer, undefined, () => fresh(false));
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const k = e.key;
      let a: Action | null = null;
      if (k === "ArrowLeft" || k === "a" || k === "A") a = { type: "move", dx: -1 };
      else if (k === "ArrowRight" || k === "d" || k === "D") a = { type: "move", dx: 1 };
      else if (k === "ArrowUp" || k === "w" || k === "W" || k === "x" || k === "X") a = { type: "rotate" };
      else if (k === "ArrowDown" || k === "s" || k === "S") a = { type: "soft" };
      // Тоглоом дууссаны дараа Space-ээр шууд дахин эхлэхгүй (санамсаргүй дарагдахаас сэргийлнэ)
      else if (k === " ") a = !s.started ? { type: "start" } : s.over ? null : { type: "hard" };
      else if (k === "p" || k === "P" || k === "Escape") a = { type: "pause" };
      if (k === " ") e.preventDefault();
      if (!a) return;
      e.preventDefault();
      dispatch(a);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
  if (s.started && !s.over) {
    const d = dropDistance(s.board, s.piece);
    for (const [r, c] of cellsOf({ ...s.piece, y: s.piece.y + d })) if (r >= 0) ghost[r * COLS + c] = s.piece.k;
    for (const [r, c] of cellsOf(s.piece)) if (r >= 0) view[r * COLS + c] = s.piece.k;
  }

  const nextShape = SHAPES[s.next].filter((row) => row.some(Boolean));

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      <AppHeader
        title="BLOCK!!!"
        subtitle="Мөрөө дүүргэж устга"
        icon={
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shrink-0">
            <Blocks size={15} className="text-white" />
          </span>
        }
      />

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
                  className="relative aspect-[1/2] rounded-2xl bg-surface-elevated border border-border p-1 shadow-2xl select-none"
                  style={{ width: "min(100%, calc((100dvh - 330px) / 2))", minWidth: 180, touchAction: "none" }}
                >
                  <div className="grid h-full gap-[2px]" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                    {view.map((k, i) => (
                      <Cell key={i} k={k} ghost={ghost[i]} />
                    ))}
                  </div>

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
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => dispatch({ type: "pause" })}
                    disabled={!s.started || s.over}
                    aria-label={s.paused ? "Үргэлжлүүлэх" : "Түр зогсоох"}
                    className="h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center disabled:opacity-40 active:scale-95"
                  >
                    {s.paused ? <Play size={15} /> : <Pause size={15} />}
                  </button>
                  <button
                    onClick={() => dispatch({ type: "start" })}
                    aria-label="Шинээр эхлэх"
                    className="h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center active:scale-95"
                  >
                    <RotateCcw size={15} />
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
              <HoldButton label="Доош" onFire={() => dispatch({ type: "soft" })}>
                <ChevronDown size={24} />
              </HoldButton>
              <HoldButton label="Шууд унагаах" repeat={false} onFire={() => dispatch({ type: "hard" })}>
                <ChevronsDown size={24} />
              </HoldButton>
            </div>
            <p className="mt-2.5 text-center text-[11px] text-on-surface-muted">
              Талбар дээр: чирж хөдөлгөх • товшиж эргүүлэх • доош шударч унагаах
              <span className="hidden lg:inline"> • Компьютер: сум, Space, P</span>
            </p>
          </div>

          {/* Ангийн рекорд */}
          <aside className="mt-5 lg:mt-0 lg:w-80 lg:shrink-0 bg-surface-elevated border border-border rounded-3xl p-4 shadow-2xl">
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
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-cyan-400/15 text-cyan-400 whitespace-nowrap">
                      {r.bestTile} мөр
                    </span>
                    <span className="text-sm font-black tabular-nums">{r.best}</span>
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
