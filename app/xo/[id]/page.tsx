"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Swords, Loader2, Flag, Check, X as XIcon, RotateCcw } from "lucide-react";
import AppHeader from "@/app/_components/AppHeader";
import { winLine } from "@/lib/xo";

type U = { name: string; fullName: string | null; avatar: string | null };
type XoGame = {
  id: string;
  challenger: string;
  opponent: string;
  status: string;
  board: string;
  turn: string | null;
  winner: string | null;
  turnExpiresAt: string | null;
  xCells: string;
  oCells: string;
};

function Player({ u, mark, active, me }: { u?: U; mark: "X" | "O"; active: boolean; me: boolean }) {
  const color = mark === "X" ? "#f43f5e" : "#0ea5e9";
  return (
    <div
      className={`flex-1 min-w-0 rounded-2xl border p-2.5 flex items-center gap-2 transition-all ${
        active ? "bg-surface-elevated shadow-lg" : "bg-surface-elevated/50 border-border opacity-70"
      }`}
      style={active ? { borderColor: color, boxShadow: `0 0 0 1px ${color}` } : undefined}
    >
      <span
        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black text-white shrink-0"
        style={{ background: color }}
      >
        {mark}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold truncate">{u?.fullName || u?.name || "…"}</p>
        <p className="text-[10px] text-on-surface-muted">{me ? "Чи" : "Өрсөлдөгч"}</p>
      </div>
    </div>
  );
}

export default function XoGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [game, setGame] = useState<XoGame | null>(null);
  const [users, setUsers] = useState<U[]>([]);
  const [me, setMe] = useState("");
  const [missing, setMissing] = useState(false);
  const [sending, setSending] = useState(false);
  const [canStart, setCanStart] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/xo/${id}`, { cache: "no-store" });
      if (res.status === 404) {
        setMissing(true);
        return;
      }
      if (!res.ok) return;
      const d = (await res.json()) as { me: string; game: XoGame; users: U[]; canStart: boolean };
      setMe(d.me);
      setGame(d.game);
      setUsers(d.users);
      setCanStart(d.canStart);
    } catch { /* */ }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Тулаан дуусах хүртэл өрсөлдөгчийн нүүдлийг шалгана
  const live = game?.status === "PENDING" || game?.status === "ACTIVE";
  useEffect(() => {
    if (!live) return;
    const t = setInterval(load, 1000);
    return () => clearInterval(t);
  }, [live, load]);

  // Нүүдлийн цаг — секунд тутам шинэчлээд дүрслэнэ
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (game?.status !== "ACTIVE" || !game.turnExpiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [game?.status, game?.turnExpiresAt]);
  const secondsLeft =
    game?.status === "ACTIVE" && game.turnExpiresAt
      ? Math.max(0, Math.ceil((new Date(game.turnExpiresAt).getTime() - now) / 1000))
      : null;

  const send = async (body: Record<string, unknown>) => {
    setSending(true);
    try {
      const res = await fetch(`/api/xo/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error);
      if (d && d.id) setGame(d);
      else load();
    } catch (e) {
      toast.error((e as Error).message || "Алдаа гарлаа");
      load();
    } finally {
      setSending(false);
    }
  };

  const move = (cell: number) => {
    if (!game || game.status !== "ACTIVE" || game.turn !== me || game.board[cell] !== "." || sending) return;
    // Шууд харагдуулна, сервер баталгаажуулна
    const mark = game.challenger === me ? "X" : "O";
    const other = game.challenger === me ? game.opponent : game.challenger;
    const field = mark === "X" ? "xCells" : "oCells";
    const prevCells = game[field].split("").map(Number);
    const removed = prevCells.length >= 3 ? prevCells[0] : null;
    let board = removed !== null ? game.board.slice(0, removed) + "." + game.board.slice(removed + 1) : game.board;
    board = board.slice(0, cell) + mark + board.slice(cell + 1);
    const newCells = (removed !== null ? prevCells.slice(1) : prevCells).concat(cell).join("");
    setGame({ ...game, board, turn: other, [field]: newCells });
    send({ action: "move", cell });
  };

  const rematch = async () => {
    if (!game) return;
    const other = game.challenger === me ? game.opponent : game.challenger;
    const res = await fetch("/api/xo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ opponent: other }),
    });
    const d = await res.json().catch(() => ({}));
    if (d.id) router.push(`/xo/${d.id}`);
    else toast.error(d.error || "Дуудаж чадсангүй");
  };

  const header = (
    <AppHeader
      title="X O тулаан"
      subtitle="Гурваа эгнүүлсэн нь ялна"
      onBack={() => router.push("/xo")}
      icon={
        <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-sky-500 flex items-center justify-center shrink-0">
          <Swords size={15} className="text-white" />
        </span>
      }
    />
  );

  if (missing) {
    return (
      <div className="min-h-screen bg-surface text-on-surface">
        {header}
        <p className="py-16 text-center text-sm text-on-surface-muted">Тулаан олдсонгүй</p>
      </div>
    );
  }
  if (!game) {
    return (
      <div className="min-h-screen bg-surface text-on-surface">
        {header}
        <div className="py-16 flex justify-center">
          <Loader2 className="animate-spin text-on-surface-muted" />
        </div>
      </div>
    );
  }

  const u = (n: string) => users.find((x) => x.name === n);
  const line = winLine(game.board);
  const myTurn = game.status === "ACTIVE" && game.turn === me;
  const iWon = game.winner === me;

  let status: React.ReactNode;
  if (game.status === "PENDING") {
    status = game.opponent === me ? "⚔️ Чамайг тулаанд дуудаж байна" : "⏳ Хариу хүлээж байна…";
  } else if (game.status === "ACTIVE") {
    status = myTurn ? "🟢 Чиний ээлж!" : "⏳ Өрсөлдөгч бодож байна…";
  } else if (game.status === "DONE") {
    status = game.winner === "DRAW" ? "🤝 Тэнцлээ" : iWon ? "🏆 Чи яллаа!" : "😵 Чи хожигдлоо";
  } else {
    status = game.status === "DECLINED" ? "🙅 Татгалзсан" : "Цуцлагдсан";
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans select-none" style={{ WebkitTapHighlightColor: "transparent" }}>
      {header}
      <div className="px-3 py-4 sm:p-6">
        <div className="max-w-sm mx-auto">
          <div className="flex gap-2">
            <Player u={u(game.challenger)} mark="X" me={game.challenger === me} active={game.status === "ACTIVE" && game.turn === game.challenger} />
            <Player u={u(game.opponent)} mark="O" me={game.opponent === me} active={game.status === "ACTIVE" && game.turn === game.opponent} />
          </div>

          <p
            className={`mt-4 text-center text-lg font-black ${
              game.status === "DONE" && iWon ? "text-emerald-400" : myTurn ? "text-emerald-400" : ""
            }`}
          >
            {status}
          </p>

          {secondsLeft !== null && (
            <div className="mt-2 flex justify-center">
              <span
                className={`px-3 py-1 rounded-full text-xs font-black border ${
                  secondsLeft <= 3
                    ? "bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse"
                    : "bg-surface-elevated text-on-surface-muted border-border"
                }`}
              >
                ⏱ {secondsLeft}с
              </span>
            </div>
          )}

          {/* Самбар */}
          <div className="mt-4 relative aspect-square rounded-3xl bg-surface-elevated border border-border p-2.5 shadow-2xl">
            <div className="grid grid-cols-3 grid-rows-3 gap-2.5 h-full">
              {game.board.split("").map((c, i) => {
                const hit = line?.includes(i);
                const can = myTurn && c === ".";
                return (
                  <button
                    key={i}
                    onClick={() => move(i)}
                    disabled={!can}
                    aria-label={`Нүд ${i + 1}`}
                    className={`rounded-2xl flex items-center justify-center text-6xl sm:text-7xl font-black transition-transform
                      ${can ? "hover:bg-card-hover active:scale-95 cursor-pointer" : ""}
                      ${hit ? "scale-105" : ""}`}
                    style={{
                      background: hit
                        ? c === "X"
                          ? "rgba(244,63,94,0.25)"
                          : "rgba(14,165,233,0.25)"
                        : "color-mix(in oklab, var(--color-on-surface) 6%, transparent)",
                      color: c === "X" ? "#f43f5e" : "#0ea5e9",
                      textShadow: hit ? `0 0 18px ${c === "X" ? "#f43f5e" : "#0ea5e9"}` : undefined,
                    }}
                  >
                    {c === "." ? "" : c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Үйлдлүүд */}
          <div className="mt-4 flex gap-2">
            {game.status === "PENDING" && game.opponent === me && (
              <>
                <button
                  onClick={() => send({ action: "decline" })}
                  disabled={sending}
                  className="flex-1 h-12 rounded-2xl border border-border font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <XIcon size={16} /> Татгалзах
                </button>
                <button
                  onClick={() => send({ action: "accept" })}
                  disabled={sending}
                  className="flex-1 h-12 rounded-2xl bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Check size={16} /> Тулах!
                </button>
              </>
            )}
            {game.status === "PENDING" && game.challenger === me && (
              <button
                onClick={() => send({ action: "cancel" })}
                disabled={sending}
                className="flex-1 h-12 rounded-2xl border border-border font-bold text-sm active:scale-95"
              >
                Дуудлага цуцлах
              </button>
            )}
            {game.status === "ACTIVE" && (
              <button
                onClick={() => {
                  if (confirm("Бууж өгөх үү?")) send({ action: "resign" });
                }}
                disabled={sending}
                className="flex-1 h-11 rounded-2xl border border-border text-on-surface-muted font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Flag size={14} /> Бууж өгөх
              </button>
            )}
            {(game.status === "DONE" || game.status === "DECLINED" || game.status === "CANCELLED") && (
              <>
                <button
                  onClick={() => router.push("/xo")}
                  className="flex-1 h-12 rounded-2xl border border-border font-bold text-sm active:scale-95"
                >
                  Буцах
                </button>
                {canStart && <button
                  onClick={rematch}
                  className="flex-1 h-12 rounded-2xl bg-accent text-white font-black text-sm flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <RotateCcw size={15} /> Дахин тулах
                </button>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
