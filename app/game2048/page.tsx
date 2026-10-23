"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Gamepad2, RotateCcw, Trophy, Crown, Loader2, Lock, Maximize2, Minimize2 } from "lucide-react";
import { useGameFullscreen } from "@/app/_components/useGameFullscreen";
import AppHeader from "@/app/_components/AppHeader";
import { useMyRoles } from "@/app/_components/useMyRoles";
import { canPlayGames, gamesClosedUntil } from "@/lib/games";

type Tile = {
  id: number;
  v: number;
  r: number;
  c: number;
  merged?: boolean;
  isNew?: boolean;
  gone?: boolean;
};

type Dir = "left" | "right" | "up" | "down";

type Saved = { tiles: Tile[]; score: number; won: boolean };

type TopRow = {
  userName: string;
  fullName: string | null;
  avatar: string | null;
  best: number;
  bestTile: number;
};

const SIZE = 4;
const STORAGE_KEY = "game2048-v1";
const GOLD = 2048;

let nextId = 1;

function addRandom(tiles: Tile[]): Tile[] {
  const used = new Set(tiles.filter((t) => !t.gone).map((t) => t.r * SIZE + t.c));
  const free: number[] = [];
  for (let i = 0; i < SIZE * SIZE; i++) if (!used.has(i)) free.push(i);
  if (!free.length) return tiles;
  const cell = free[Math.floor(Math.random() * free.length)];
  return [
    ...tiles,
    { id: nextId++, v: Math.random() < 0.9 ? 2 : 4, r: Math.floor(cell / SIZE), c: cell % SIZE, isNew: true },
  ];
}

function newGame(): Tile[] {
  return addRandom(addRandom([]));
}

/** Нэг нүүдэл — хавтангуудыг шилжүүлж, ижил тоог нийлүүлнэ */
function move(tiles: Tile[], dir: Dir): { tiles: Tile[]; gained: number; moved: boolean } {
  const live = tiles.filter((t) => !t.gone).map((t) => ({ ...t, merged: false, isNew: false }));
  const grid: (Tile | null)[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  for (const t of live) grid[t.r][t.c] = t;

  let gained = 0;
  let moved = false;
  const order = [0, 1, 2, 3];
  const rev = [3, 2, 1, 0];

  for (let i = 0; i < SIZE; i++) {
    // Шилжих зүг рүү ойроос нь эхэлж уншина
    const line: Tile[] = [];
    for (const j of dir === "left" || dir === "up" ? order : rev) {
      const t = dir === "left" || dir === "right" ? grid[i][j] : grid[j][i];
      if (t) line.push(t);
    }

    let pos = 0;
    let last: Tile | null = null;
    const place = (t: Tile, p: number) => {
      const [r, c] =
        dir === "left" ? [i, p] : dir === "right" ? [i, SIZE - 1 - p] : dir === "up" ? [p, i] : [SIZE - 1 - p, i];
      if (t.r !== r || t.c !== c) moved = true;
      t.r = r;
      t.c = c;
    };

    for (const t of line) {
      if (last && last.v === t.v && !last.merged) {
        last.v *= 2;
        last.merged = true;
        gained += last.v;
        t.gone = true;
        place(t, pos - 1);
        moved = true;
        last = null;
      } else {
        place(t, pos);
        last = t;
        pos++;
      }
    }
  }

  return { tiles: live, gained, moved };
}

function canMove(tiles: Tile[]) {
  const live = tiles.filter((t) => !t.gone);
  if (live.length < SIZE * SIZE) return true;
  const g: number[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  for (const t of live) g[t.r][t.c] = t.v;
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (c + 1 < SIZE && g[r][c] === g[r][c + 1]) return true;
      if (r + 1 < SIZE && g[r][c] === g[r + 1][c]) return true;
    }
  return false;
}

function loadSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Saved;
    if (!Array.isArray(s.tiles) || typeof s.score !== "number") return null;
    return s;
  } catch {
    return null;
  }
}

/** Хавтан бүрийн цол — рекордыг тооны оронд цолоор харуулна */
const TITLES: Record<number, string> = {
  2: "Шинэков",
  4: "Сурагч",
  8: "Хичээнгүй сурагч",
  16: "Онц сурагч",
  32: "Салааны дарга",
  64: "Ангийн дарга",
  128: "Олимпиадч",
  256: "Медальт",
  512: "Суут ухаантан",
  1024: "Профессор",
  2048: "Аварга",
};

function titleOf(v: number) {
  if (v <= 0) return "—";
  return TITLES[v] ?? (v > GOLD ? "Ариун цэвэр дарга" : "Шинэков");
}

/** Тоо бүр өөрийн энгийн өнгөтэй; 2048 хамгийн гоё, 4096+ ганцаараа алтан */
const COLORS: Record<number, { bg: string; fg: string }> = {
  2: { bg: "#fb923c", fg: "#431407" }, // улбар шар
  4: { bg: "#fde047", fg: "#422006" }, // шар
  8: { bg: "#4ade80", fg: "#052e16" }, // ногоон
  16: { bg: "#2dd4bf", fg: "#042f2e" }, // оюу
  32: { bg: "#38bdf8", fg: "#082f49" }, // цэнхэр
  64: { bg: "#3b82f6", fg: "#ffffff" }, // хөх
  128: { bg: "#6366f1", fg: "#ffffff" }, // индиго
  256: { bg: "#a855f7", fg: "#ffffff" }, // нил ягаан
  512: { bg: "#ec4899", fg: "#ffffff" }, // ягаан
  1024: { bg: "#ef4444", fg: "#ffffff" }, // улаан
};

function tileStyle(v: number): React.CSSProperties {
  if (v > GOLD) {
    return {
      background: "linear-gradient(135deg, #fff3b0 0%, #fbbf24 40%, #d97706 75%, #92400e 100%)",
      color: "#3b1d00",
      boxShadow: "0 0 18px 2px rgba(251,191,36,0.65), inset 0 1px 0 rgba(255,255,255,0.7)",
    };
  }
  if (v === GOLD) {
    return {
      background: "linear-gradient(135deg, #0f172a 0%, #312e81 45%, #0e7490 100%)",
      color: "#67e8f9",
      textShadow: "0 0 8px rgba(103,232,249,0.8)",
      boxShadow: "0 0 16px 2px rgba(34,211,238,0.55), inset 0 0 0 1.5px rgba(103,232,249,0.6)",
    };
  }
  const c = COLORS[v] ?? COLORS[2];
  return { background: c.bg, color: c.fg };
}

function numberSize(v: number) {
  const d = String(v).length;
  return d <= 2 ? "text-lg sm:text-2xl" : d === 3 ? "text-base sm:text-xl" : "text-sm sm:text-lg";
}

export default function Game2048Page() {
  const router = useRouter();
  const { roles } = useMyRoles();
  const allowed = canPlayGames(roles?.role);
  const { full, toggle: toggleFull, exit: exitFull } = useGameFullscreen();
  const isAdmin = roles?.role === "ADMIN";
  // Админ түр хаасан эсэх — цаг болоход өөрөө нээгдэнэ
  const [closedUntil, setClosedUntil] = useState<number | null>(() => gamesClosedUntil());
  useEffect(() => {
    if (!closedUntil) return;
    const id = setInterval(() => setClosedUntil(gamesClosedUntil()), 1000);
    return () => clearInterval(id);
  }, [closedUntil]);
  const locked = !!closedUntil && !isAdmin;

  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [won, setWon] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [over, setOver] = useState(false);
  const [myBest, setMyBest] = useState(0);
  const [myBestTile, setMyBestTile] = useState(0);
  const [top, setTop] = useState<TopRow[] | null>(null);
  const [me, setMe] = useState("");
  const touch = useRef<{ x: number; y: number } | null>(null);
  const submitted = useRef(0);
  const submittedTile = useRef(0);

  useEffect(() => {
    if (roles && !allowed) router.replace("/");
  }, [roles, allowed, router]);

  // Хадгалсан тоглолтыг сэргээнэ
  useEffect(() => {
    try {
      setMe(localStorage.getItem("name") ?? "");
    } catch { /* */ }
    const s = loadSaved();
    if (s && s.tiles.length) {
      const live = s.tiles.filter((t) => !t.gone).map((t) => ({ ...t, merged: false, isNew: false }));
      nextId = Math.max(0, ...live.map((t) => t.id)) + 1;
      setTiles(live);
      setScore(s.score);
      setWon(!!s.won);
      setOver(!canMove(live));
    } else {
      setTiles(newGame());
    }
  }, []);

  useEffect(() => {
    if (!tiles.length) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tiles: tiles.filter((t) => !t.gone), score, won }));
    } catch { /* */ }
  }, [tiles, score, won]);

  const loadTop = useCallback(async () => {
    try {
      const res = await fetch("/api/games/2048", { cache: "no-store" });
      if (!res.ok) return;
      const d = (await res.json()) as { top: TopRow[]; myBest: number; myBestTile: number };
      setTop(d.top);
      setMyBest((b) => Math.max(b, d.myBest));
      submitted.current = Math.max(submitted.current, d.myBest);
      setMyBestTile((b) => Math.max(b, d.myBestTile ?? 0));
      submittedTile.current = Math.max(submittedTile.current, d.myBestTile ?? 0);
    } catch { /* */ }
  }, []);

  useEffect(() => {
    if (allowed) loadTop();
  }, [allowed, loadTop]);

  const maxTile = tiles.reduce((m, t) => (t.gone ? m : Math.max(m, t.v)), 0);
  const recordTile = Math.max(myBestTile, maxTile);

  // Рекорд ахивал хэсэг хугацааны дараа (эсвэл тоглоом дуусахад шууд) хадгална
  useEffect(() => {
    const better = () => score > submitted.current || maxTile > submittedTile.current;
    if (!allowed || !better()) return;
    const send = async () => {
      if (!better()) return;
      submitted.current = Math.max(submitted.current, score);
      submittedTile.current = Math.max(submittedTile.current, maxTile);
      try {
        await fetch("/api/games/2048", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ score, tile: maxTile }),
        });
        loadTop();
      } catch { /* */ }
    };
    if (over) {
      send();
      return;
    }
    const t = setTimeout(send, 1500);
    return () => clearTimeout(t);
  }, [score, over, allowed, maxTile, loadTop]);

  const doMove = useCallback(
    (dir: Dir) => {
      if (over || showWin || locked) return;
      const res = move(tiles, dir);
      if (!res.moved) return;
      const next = addRandom(res.tiles);
      const newScore = score + res.gained;
      setTiles(next);
      setScore(newScore);
      setMyBest((b) => Math.max(b, newScore));
      if (!won && next.some((t) => !t.gone && t.v >= GOLD)) {
        setWon(true);
        setShowWin(true);
      }
      if (!canMove(next)) setOver(true);
    },
    [tiles, score, over, showWin, won, locked],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const map: Record<string, Dir> = {
        ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
        a: "left", d: "right", w: "up", s: "down",
      };
      const dir = map[e.key] ?? map[e.key.toLowerCase()];
      if (!dir) return;
      e.preventDefault();
      doMove(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doMove]);

  const restart = () => {
    setTiles(newGame());
    setScore(0);
    setWon(false);
    setShowWin(false);
    setOver(false);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current;
    touch.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  };

  if (!roles || !allowed) return <div className="min-h-screen bg-surface" />;

  if (locked && closedUntil) {
    const left = Math.max(0, closedUntil - Date.now());
    const h = Math.floor(left / 3_600_000);
    const m = Math.floor((left % 3_600_000) / 60_000);
    const s = Math.floor((left % 60_000) / 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const at = new Date(closedUntil).toLocaleString("mn-MN", {
      timeZone: "Asia/Ulaanbaatar",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return (
      <div className="min-h-screen bg-surface text-on-surface font-sans">
        <AppHeader title="2048" subtitle="Түр хаалттай" />
        <div className="px-4 py-10 flex justify-center">
          <div className="w-full max-w-sm bg-surface-elevated border border-border rounded-3xl p-6 text-center shadow-2xl">
            <span className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center mb-4">
              <Lock size={26} className="text-amber-400" />
            </span>
            <p className="text-lg font-black">Админы зүгээс хаасан байна</p>
            <p className="text-sm text-on-surface-muted mt-1">
              Тоглоом <b className="text-on-surface">{at}</b>-д дахин нээгдэнэ
            </p>
            <p className="mt-5 text-3xl font-black tabular-nums tracking-tight text-amber-400">
              {pad(h)}:{pad(m)}:{pad(s)}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-muted mt-1">үлдсэн хугацаа</p>
          </div>
        </div>
      </div>
    );
  }

  // Нүдний байрлал: 4 нүд + 5 завсар (завсар = 2.5%)
  const GAP = 2.5;
  const CELL = (100 - GAP * (SIZE + 1)) / SIZE;
  const at = (i: number) => `${GAP + i * (CELL + GAP)}%`;

  return (
    <div
      className={`${full ? "fixed inset-0 z-[100] overflow-y-auto overscroll-none" : "min-h-screen"}
        bg-surface text-on-surface font-sans select-none [-webkit-touch-callout:none]`}
      style={{ WebkitUserSelect: "none", WebkitTapHighlightColor: "transparent" }}
    >
      <style>{`
        @keyframes tile-pop { 0% { transform: scale(0.4); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
        @keyframes tile-merge { 0% { transform: scale(1) } 45% { transform: scale(1.14) } 100% { transform: scale(1) } }
        .tile-new { animation: tile-pop 160ms ease-out 90ms backwards }
        .tile-merged { animation: tile-merge 180ms ease-out 80ms }
      `}</style>

      {!full && <AppHeader
        title="2048"
        subtitle="Ижил тоог нийлүүл"
        icon={
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shrink-0">
            <Gamepad2 size={15} className="text-white" />
          </span>
        }
      />}
      {full && (
        <div className="flex items-center justify-between gap-3 px-3 pt-[calc(env(safe-area-inset-top)+10px)] pb-1">
          <p className="text-lg font-black">2048</p>
          <button
            onClick={exitFull}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-elevated border border-border text-xs font-bold active:scale-95"
          >
            <Minimize2 size={14} /> Жижигрүүлэх
          </button>
        </div>
      )}

      <div className="px-3 py-4 sm:p-6">
        <div className="max-w-md lg:max-w-4xl mx-auto lg:flex lg:items-start lg:gap-6">
          {/* Тоглоом */}
          <div className="w-full max-w-md mx-auto lg:mx-0 lg:flex-1">
            {closedUntil && isAdmin && (
              <p className="mb-3 flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-400">
                <Lock size={13} /> Бусдад хаалттай байна — зөвхөн админ тоглож байна
              </p>
            )}
            <div className="flex items-stretch gap-2 mb-3">
              <div className="flex-1 bg-surface-elevated border border-border rounded-2xl px-3 py-2">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-muted font-semibold">Оноо</p>
                <p className="text-xl font-black tabular-nums">{score}</p>
              </div>
              <div className="flex-1 bg-surface-elevated border border-border rounded-2xl px-3 py-2">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-muted font-semibold">Миний рекорд</p>
                <p className="text-base sm:text-lg font-black text-amber-400 truncate leading-7">{titleOf(recordTile)}</p>
                <p className="text-[10px] text-on-surface-muted tabular-nums">{myBest} оноо</p>
              </div>
              <button
                onClick={restart}
                className="px-3 rounded-2xl bg-accent text-white font-black text-xs flex flex-col items-center justify-center gap-0.5 hover:opacity-90 active:scale-95"
              >
                <RotateCcw size={16} />
                Шинэ
              </button>
              <button
                onClick={toggleFull}
                aria-label={full ? "Жижигрүүлэх" : "Дэлгэц дүүргэх"}
                className="px-3 rounded-2xl bg-surface-elevated border border-border font-black text-xs flex flex-col items-center justify-center gap-0.5 active:scale-95"
              >
                {full ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                {full ? "Жижиг" : "Том"}
              </button>
            </div>

            <div
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              className="relative w-full aspect-square rounded-3xl bg-surface-elevated border border-border shadow-2xl select-none overflow-hidden"
              style={{ touchAction: "none" }}
            >
              {/* Хоосон нүднүүд */}
              {Array.from({ length: SIZE * SIZE }, (_, i) => (
                <div
                  key={`cell${i}`}
                  className="absolute rounded-xl"
                  style={{
                    left: at(i % SIZE),
                    top: at(Math.floor(i / SIZE)),
                    width: `${CELL}%`,
                    height: `${CELL}%`,
                    background: "color-mix(in oklab, var(--color-on-surface) 7%, transparent)",
                  }}
                />
              ))}

              {/* Хавтангууд */}
              {tiles.map((t) => (
                <div
                  key={t.id}
                  className="absolute"
                  style={{
                    left: at(t.c),
                    top: at(t.r),
                    width: `${CELL}%`,
                    height: `${CELL}%`,
                    transition: "left 110ms ease-in-out, top 110ms ease-in-out",
                    zIndex: t.gone ? 1 : t.merged ? 3 : 2,
                  }}
                >
                  <div
                    className={`relative w-full h-full rounded-xl ${t.isNew ? "tile-new" : ""} ${t.merged ? "tile-merged" : ""}`}
                    style={tileStyle(t.v)}
                  >
                    <span className="absolute left-1.5 top-1 sm:left-2 sm:top-1.5 right-1.5 text-[8px] sm:text-[10px] font-bold leading-[1.15] opacity-85 line-clamp-2">
                      {titleOf(t.v)}
                    </span>
                    <span className={`absolute right-1.5 bottom-1 sm:right-2 sm:bottom-1.5 font-black tabular-nums leading-none ${numberSize(t.v)}`}>
                      {t.v}
                    </span>
                  </div>
                </div>
              ))}

              {(over || showWin) && (
                <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <p className="text-3xl font-black text-white">
                    {showWin ? "2048! 🎉" : "Тоглоом дууслаа"}
                  </p>
                  <p className="text-sm text-white/80">Оноо: <b className="text-amber-300">{score}</b></p>
                  <div className="flex gap-2">
                    {showWin && (
                      <button
                        onClick={() => setShowWin(false)}
                        className="px-4 py-2.5 rounded-2xl bg-amber-400 text-amber-950 font-black text-sm active:scale-95"
                      >
                        Үргэлжлүүлэх
                      </button>
                    )}
                    <button
                      onClick={restart}
                      className="px-4 py-2.5 rounded-2xl bg-white text-black font-black text-sm active:scale-95"
                    >
                      Дахин тоглох
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p className="mt-3 text-center text-[11px] text-on-surface-muted">
              Утсан дээр хуруугаараа шударна • Компьютер дээр сум эсвэл WASD товч
            </p>
          </div>

          {!full && <div className="mt-6 lg:mt-0 lg:w-80 lg:shrink-0 space-y-4">
          {/* Цолнууд — хүрсэн цол тод, хүрээгүй нь бүдэг */}
          <aside className="bg-surface-elevated border border-border rounded-3xl p-4 shadow-2xl">
            <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-on-surface-muted font-semibold mb-3">
              <Crown size={14} className="text-amber-400" />
              Цолнууд
            </p>
            <ol className="grid grid-cols-2 gap-1.5">
              {[...Object.keys(TITLES).map(Number), GOLD * 2].map((v) => {
                const reached = recordTile >= v;
                return (
                  <li
                    key={v}
                    className={`flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition-opacity ${reached ? "" : "opacity-40"}`}
                  >
                    <span
                      className="w-11 shrink-0 rounded-lg py-1 text-center text-[10px] font-black tabular-nums"
                      style={tileStyle(v)}
                    >
                      {v === GOLD * 2 ? "4096+" : v}
                    </span>
                    <span className="text-[11px] font-bold leading-tight min-w-0">{titleOf(v)}</span>
                  </li>
                );
              })}
            </ol>
          </aside>

          {/* Ангийн рекорд */}
          <aside className="bg-surface-elevated border border-border rounded-3xl p-4 shadow-2xl">
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
                {top.map((r, i) => {
                  const mine = r.userName === me;
                  return (
                    <li
                      key={r.userName}
                      className={`flex items-center gap-2.5 rounded-2xl px-2.5 py-2 ${mine ? "bg-accent/15 border border-accent/30" : "bg-surface-alt/50"}`}
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
                      {r.bestTile > 0 && (
                        <span
                          className="px-1.5 py-0.5 rounded-md text-[10px] font-black whitespace-nowrap"
                          style={tileStyle(Math.min(r.bestTile, 1 << 20))}
                        >
                          {titleOf(r.bestTile)}
                        </span>
                      )}
                      <span className="text-sm font-black tabular-nums">{r.best}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </aside>
          </div>}
        </div>
      </div>
    </div>
  );
}
