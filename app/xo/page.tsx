"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Swords, Search, Loader2, Check, X as XIcon, ChevronRight, Trophy } from "lucide-react";
import AppHeader from "@/app/_components/AppHeader";
import { useMyRoles } from "@/app/_components/useMyRoles";

type U = { name: string; fullName: string | null; avatar: string | null };
type XoGame = {
  id: string;
  challenger: string;
  opponent: string;
  status: string;
  board: string;
  turn: string | null;
  winner: string | null;
  updatedAt: string;
};
type Data = {
  me: string;
  online: string[];
  games: XoGame[];
  stats: { win: number; draw: number; loss: number };
  users: U[];
  canStart: boolean;
};

function Avatar({ u, size = 36, online = false }: { u?: U; size?: number; online?: boolean }) {
  return (
    <span className="relative shrink-0" style={{ width: size, height: size }}>
      <span className="w-full h-full rounded-full overflow-hidden bg-accent/15 flex items-center justify-center text-accent text-xs font-black">
        {u?.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : (u?.fullName || u?.name || "?")[0]?.toUpperCase()}
      </span>
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-surface-elevated" />
      )}
    </span>
  );
}

/** Жижиг самбар — жагсаалтад тулааны байдлыг харуулна */
function MiniBoard({ board }: { board: string }) {
  return (
    <span className="grid grid-cols-3 gap-[2px] w-9 h-9 shrink-0">
      {board.split("").map((c, i) => (
        <span
          key={i}
          className={`rounded-[2px] text-[8px] font-black flex items-center justify-center ${
            c === "X" ? "bg-rose-500/80 text-white" : c === "O" ? "bg-sky-500/80 text-white" : "bg-on-surface/10"
          }`}
        >
          {c === "." ? "" : c}
        </span>
      ))}
    </span>
  );
}

export default function XoLobby() {
  const router = useRouter();
  const { roles } = useMyRoles();
  const [data, setData] = useState<Data | null>(null);
  const [students, setStudents] = useState<U[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/xo", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch { /* */ }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!data?.canStart || students.length) return;
    fetch("/api/students")
      .then((r) => (r.ok ? r.json() : []))
      .then(setStudents)
      .catch(() => {});
  }, [data?.canStart, students.length]);

  const userMap = useMemo(() => {
    const m = new Map<string, U>();
    for (const u of [...students, ...(data?.users ?? [])]) m.set(u.name, u);
    return m;
  }, [students, data]);
  // Нэрийг серверээс авна (localStorage-д жижиг үсгээр хадгалагддаг тул таарахгүй)
  const me = data?.me ?? "";
  const nameOf = (n: string) => userMap.get(n)?.fullName || n;

  const challenge = async (opponent: string) => {
    setBusy(opponent);
    try {
      const res = await fetch("/api/xo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ opponent }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 409 && d.id) {
        router.push(`/xo/${d.id}`);
        return;
      }
      if (!res.ok) throw new Error(d.error);
      toast.success(`${nameOf(opponent)}-д дуудлага явууллаа ⚔️`);
      router.push(`/xo/${d.id}`);
    } catch (e) {
      toast.error((e as Error).message || "Явуулж чадсангүй");
    } finally {
      setBusy(null);
    }
  };

  const act = async (id: string, action: "accept" | "decline" | "cancel") => {
    setBusy(id);
    try {
      const res = await fetch(`/api/xo/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error);
      if (action === "accept") router.push(`/xo/${id}`);
      else load();
    } catch (e) {
      toast.error((e as Error).message || "Алдаа гарлаа");
    } finally {
      setBusy(null);
    }
  };

  const games = data?.games ?? [];
  const incoming = games.filter((g) => g.status === "PENDING" && g.opponent === me);
  const outgoing = games.filter((g) => g.status === "PENDING" && g.challenger === me);
  const active = games.filter((g) => g.status === "ACTIVE");
  const history = games.filter((g) => g.status === "DONE").slice(0, 10);
  const busyWith = new Set(
    games.filter((g) => g.status === "PENDING" || g.status === "ACTIVE").map((g) => (g.challenger === me ? g.opponent : g.challenger)),
  );
  const online = new Set(data?.online ?? []);
  // Идэвхтэй хүмүүс эхэнд
  const candidates = students
    .filter((s) => s.name !== me && (!q.trim() || (s.fullName || s.name).toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a, b) => Number(online.has(b.name)) - Number(online.has(a.name)));

  const Row = ({ g, right }: { g: XoGame; right: React.ReactNode }) => {
    const other = g.challenger === me ? g.opponent : g.challenger;
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-surface-alt/50 border border-border-subtle px-3 py-2.5">
        <Avatar u={userMap.get(other)} online={online.has(other)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{nameOf(other)}</p>
          <p className="text-[10px] text-on-surface-muted">Чи: {g.challenger === me ? "X" : "O"}</p>
        </div>
        {right}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      <AppHeader
        title="X O тулаан"
        subtitle="Анги нэгнээ дуудаж тулал"
        icon={
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-sky-500 flex items-center justify-center shrink-0">
            <Swords size={15} className="text-white" />
          </span>
        }
      >
        {roles?.role === "ADMIN" && (
          <button
            onClick={() => router.push("/xo/leaderboard")}
            aria-label="Тэргүүлэгчид"
            title="Тэргүүлэгчид"
            className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-surface-elevated border border-border
              hover:bg-card-hover active:scale-95 transition-all shrink-0 text-amber-400"
          >
            <Trophy size={18} />
          </button>
        )}
      </AppHeader>

      <div className="px-3 py-4 sm:p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {!data ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="animate-spin text-on-surface-muted" />
            </div>
          ) : (
            <>
              {/* Амжилт */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["Ялсан", data.stats.win, "text-emerald-400"],
                  ["Тэнцсэн", data.stats.draw, "text-amber-400"],
                  ["Хожигдсон", data.stats.loss, "text-rose-400"],
                ].map(([l, v, c]) => (
                  <div key={l as string} className="bg-surface-elevated border border-border rounded-2xl p-3 text-center">
                    <p className={`text-2xl font-black tabular-nums ${c}`}>{v}</p>
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-muted font-semibold">{l}</p>
                  </div>
                ))}
              </div>

              {incoming.length > 0 && (
                <section className="bg-surface-elevated border border-amber-500/40 rounded-3xl p-4 space-y-2">
                  <p className="text-xs uppercase tracking-widest text-amber-400 font-bold">⚔️ Чамайг дуудаж байна</p>
                  {incoming.map((g) => (
                    <Row
                      key={g.id}
                      g={g}
                      right={
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => act(g.id, "decline")}
                            disabled={busy === g.id}
                            aria-label="Татгалзах"
                            className="w-10 h-10 rounded-xl border border-border flex items-center justify-center active:scale-95"
                          >
                            <XIcon size={16} />
                          </button>
                          <button
                            onClick={() => act(g.id, "accept")}
                            disabled={busy === g.id}
                            className="px-3 h-10 rounded-xl bg-emerald-500 text-white text-xs font-black flex items-center gap-1 active:scale-95"
                          >
                            <Check size={15} /> Тулах
                          </button>
                        </div>
                      }
                    />
                  ))}
                </section>
              )}

              {active.length > 0 && (
                <section className="bg-surface-elevated border border-border rounded-3xl p-4 space-y-2">
                  <p className="text-xs uppercase tracking-widest text-on-surface-muted font-bold">Явагдаж буй</p>
                  {active.map((g) => (
                    <button key={g.id} onClick={() => router.push(`/xo/${g.id}`)} className="block w-full text-left">
                      <Row
                        g={g}
                        right={
                          <span className="flex items-center gap-2">
                            <MiniBoard board={g.board} />
                            <span
                              className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                                g.turn === me ? "bg-emerald-500 text-white" : "bg-surface-alt text-on-surface-muted"
                              }`}
                            >
                              {g.turn === me ? "Чиний ээлж" : "Хүлээж байна"}
                            </span>
                          </span>
                        }
                      />
                    </button>
                  ))}
                </section>
              )}

              {outgoing.length > 0 && (
                <section className="bg-surface-elevated border border-border rounded-3xl p-4 space-y-2">
                  <p className="text-xs uppercase tracking-widest text-on-surface-muted font-bold">Хариу хүлээж буй</p>
                  {outgoing.map((g) => (
                    <Row
                      key={g.id}
                      g={g}
                      right={
                        <button
                          onClick={() => act(g.id, "cancel")}
                          disabled={busy === g.id}
                          className="px-3 h-9 rounded-xl border border-border text-xs font-bold active:scale-95"
                        >
                          Цуцлах
                        </button>
                      }
                    />
                  ))}
                </section>
              )}

              {/* Дуудах */}
              {data.canStart && (
                <section className="bg-surface-elevated border border-border rounded-3xl p-4">
                  <p className="text-xs uppercase tracking-widest text-on-surface-muted font-bold mb-3">Хэнийг дуудах вэ?</p>
                  <label className="flex items-center gap-2 rounded-xl bg-surface-alt border border-border px-3 py-2 mb-3">
                    <Search size={14} className="text-on-surface-muted" />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Нэрээр хайх"
                      className="flex-1 bg-transparent outline-none text-sm"
                    />
                  </label>
                  <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
                    {candidates.map((s) => {
                      const engaged = busyWith.has(s.name);
                      return (
                        <div key={s.name} className="flex items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-card-hover">
                          <Avatar u={s} size={32} online={online.has(s.name)} />
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-bold truncate">{s.fullName || s.name}</span>
                            {online.has(s.name) && (
                              <span className="block text-[10px] font-bold text-emerald-400 leading-tight">● Идэвхтэй</span>
                            )}
                          </span>
                          <button
                            onClick={() => challenge(s.name)}
                            disabled={busy === s.name}
                            className={`px-3 h-8 rounded-xl text-xs font-black flex items-center gap-1 active:scale-95 ${
                              engaged ? "border border-border text-on-surface-muted" : "bg-accent text-white"
                            }`}
                          >
                            {busy === s.name ? <Loader2 size={13} className="animate-spin" /> : engaged ? <ChevronRight size={13} /> : <Swords size={13} />}
                            {engaged ? "Нээх" : "Дуудах"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {history.length > 0 && (
                <section className="bg-surface-elevated border border-border rounded-3xl p-4 space-y-2">
                  <p className="text-xs uppercase tracking-widest text-on-surface-muted font-bold">Сүүлийн тулаанууд</p>
                  {history.map((g) => (
                    <button key={g.id} onClick={() => router.push(`/xo/${g.id}`)} className="block w-full text-left">
                      <Row
                        g={g}
                        right={
                          <span className="flex items-center gap-2">
                            <MiniBoard board={g.board} />
                            <span
                              className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                                g.winner === me
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : g.winner === "DRAW"
                                    ? "bg-amber-500/15 text-amber-400"
                                    : "bg-rose-500/15 text-rose-400"
                              }`}
                            >
                              {g.winner === me ? "Ялсан" : g.winner === "DRAW" ? "Тэнцсэн" : "Хожигдсон"}
                            </span>
                          </span>
                        }
                      />
                    </button>
                  ))}
                </section>
              )}

              {!data.canStart && !incoming.length && !active.length && !history.length && (
                <p className="py-10 text-center text-sm text-on-surface-muted">Одоохондоо тулаан алга.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
