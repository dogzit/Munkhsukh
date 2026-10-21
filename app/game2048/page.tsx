"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Gamepad2, RotateCcw, Trophy, Crown, Loader2 } from "lucide-react";
import AppHeader from "@/app/_components/AppHeader";
import { useMyRoles } from "@/app/_components/useMyRoles";
import { canPlayGames } from "@/lib/games";

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

/** Бага тоо бараан, том тоо тод; 2048-аас дээш алтан */
function tileStyle(v: number): React.CSSProperties {
  if (v >= GOLD) {
    return {
      background: "linear-gradient(135deg, #fff3b0 0%, #fbbf24 40%, #d97706 75%, #92400e 100%)",
      color: "#3b1d00",
      boxShadow: "0 0 18px 2px rgba(251,191,36,0.65), inset 0 1px 0 rgba(255,255,255,0.7)",
    };
  }
  const level = Math.log2(v); // 1 (2) … 10 (1024)
  const t = (level - 1) / 9; // 0 … 1
  const mix = Math.round(14 + t * 76); // 14% … 90% accent
  const light = Math.round(t * 22); // сүүлийн шатуудад цагаан холино
  return {
    background: `color-mix(in oklab, color-mix(in oklab, var(--color-accent) ${mix}%, #0c0c14) ${100 - light}%, white)`,
    color: t > 0.45 ? "#ffffff" : "color-mix(in oklab, var(--color-accent) 55%, #e5e7eb)",
    boxShadow: t > 0.5 ? `0 0 ${Math.round(t * 16)}px color-mix(in oklab, var(--color-accent) 55%, transparent)` : undefined,
  };
}

function numberSize(v: number) {
  const d = String(v).length;
  return d <= 2 ? "text-lg sm:text-2xl" : d === 3 ? "text-base sm:text-xl" : "text-sm sm:text-lg";
}

export default function Game2048Page() {
  const router = useRouter();
  const { roles } = useMyRoles();
  const allowed = canPlayGames(roles?.role);

  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [won, setWon] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [over, setOver] = useState(false);
  const [myBest, setMyBest] = useState(0);
  const [top, setTop] = useState<TopRow[] | null>(null);
  const [me, setMe] = useState("");
  const touch = useRef<{ x: number; y: number } | null>(null);
  const submitted = useRef(0);

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
      const d = (await res.json()) as { top: TopRow[]; myBest: number };
      setTop(d.top);
      setMyBest((b) => Math.max(b, d.myBest));
      submitted.current = Math.max(submitted.current, d.myBest);
    } catch { /* */ }
  }, []);

  useEffect(() => {
    if (allowed) loadTop();
  }, [allowed, loadTop]);

  const maxTile = tiles.reduce((m, t) => (t.gone ? m : Math.max(m, t.v)), 0);

  // Рекорд ахивал хэсэг хугацааны дараа (эсвэл тоглоом дуусахад шууд) хадгална
  useEffect(() => {
    if (!allowed || score <= submitted.current) return;
    const send = async () => {
      if (score <= submitted.current) return;
      submitted.current = score;
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
      if (over || showWin) return;
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
    [tiles, score, over, showWin, won],
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

  // Нүдний байрлал: 4 нүд + 5 завсар (завсар = 2.5%)
  const GAP = 2.5;
  const CELL = (100 - GAP * (SIZE + 1)) / SIZE;
  const at = (i: number) => `${GAP + i * (CELL + GAP)}%`;

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      <style>{`
        @keyframes tile-pop { 0% { transform: scale(0.4); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
        @keyframes tile-merge { 0% { transform: scale(1) } 45% { transform: scale(1.14) } 100% { transform: scale(1) } }
        .tile-new { animation: tile-pop 160ms ease-out 90ms backwards }
        .tile-merged { animation: tile-merge 180ms ease-out 80ms }
      `}</style>

      <AppHeader
        title="2048"
        subtitle="Ижил тоог нийлүүл"
        icon={
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shrink-0">
            <Gamepad2 size={15} className="text-white" />
          </span>
        }
      />

      <div className="px-3 py-4 sm:p-6">
        <div className="max-w-md lg:max-w-4xl mx-auto lg:flex lg:items-start lg:gap-6">
          {/* Тоглоом */}
          <div className="w-full max-w-md mx-auto lg:mx-0 lg:flex-1">
            <div className="flex items-stretch gap-2 mb-3">
              <div className="flex-1 bg-surface-elevated border border-border rounded-2xl px-3 py-2">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-muted font-semibold">Оноо</p>
                <p className="text-xl font-black tabular-nums">{score}</p>
              </div>
              <div className="flex-1 bg-surface-elevated border border-border rounded-2xl px-3 py-2">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-muted font-semibold">Миний рекорд</p>
                <p className="text-xl font-black tabular-nums text-amber-400">{myBest}</p>
              </div>
              <button
                onClick={restart}
                className="px-3 rounded-2xl bg-accent text-white font-black text-xs flex flex-col items-center justify-center gap-0.5 hover:opacity-90 active:scale-95"
              >
                <RotateCcw size={16} />
                Шинэ
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

          {/* Ангийн рекорд */}
          <aside className="mt-6 lg:mt-0 lg:w-80 lg:shrink-0 bg-surface-elevated border border-border rounded-3xl p-4 shadow-2xl">
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
                          className="px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums"
                          style={tileStyle(Math.min(r.bestTile, 1 << 20))}
                        >
                          {r.bestTile}
                        </span>
                      )}
                      <span className="text-sm font-black tabular-nums">{r.best}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
