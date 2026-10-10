"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Check, Clock, Loader2, Plus, Square, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import AppHeader from "@/app/_components/AppHeader";
import Skeleton from "@/app/_components/Skeleton";

type Poll = {
  id: string;
  question: string;
  options: string[];
  createdBy: string;
  createdAt: string;
  endsAt: string;
  open: boolean;
  counts: number[];
  total: number;
  myVote: number | null;
  voters?: string[][];
};

const MAX_OPTIONS = 6;

function formatLeft(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function PollPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  // Серверийн цагтай зөрүү — утасны цаг буруу байсан ч тоолуур зөв явна
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [showVoters, setShowVoters] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/polls");
      if (!res.ok) return;
      const data = await res.json();
      setPolls(data.polls);
      setIsAdmin(data.isAdmin);
      setOffset(data.serverNow - Date.now());
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    const poll = setInterval(load, 3000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(t);
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [load]);

  const serverNow = now + offset;
  const isOpen = (p: Poll) => new Date(p.endsAt).getTime() > serverNow;

  const create = async () => {
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim()) return toast.error("Асуултаа бичнэ үү");
    if (opts.length < 2) return toast.error("Дор хаяж 2 хариулт бичнэ үү");
    setCreating(true);
    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, options: opts }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error ?? "Алдаа гарлаа");
      setQuestion("");
      setOptions(["", ""]);
      toast.success("Санал асуулга эхэллээ — 3 минут");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Алдаа гарлаа");
    }
    setCreating(false);
  };

  const vote = async (p: Poll, option: number) => {
    if (!isOpen(p) || busy) return;
    setBusy(p.id);
    // Шууд харагдуулахын тулд урьдчилан шинэчилнэ
    setPolls((prev) =>
      prev.map((x) => {
        if (x.id !== p.id) return x;
        const counts = [...x.counts];
        if (x.myVote !== null) counts[x.myVote]--;
        counts[option]++;
        return { ...x, counts, myVote: option, total: x.myVote === null ? x.total + 1 : x.total };
      }),
    );
    try {
      const res = await fetch(`/api/polls/${p.id}/vote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ option }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) toast.error(j?.error ?? "Санал өгөхөд алдаа гарлаа");
    } catch {
      toast.error("Санал өгөхөд алдаа гарлаа");
    }
    await load();
    setBusy(null);
  };

  const stop = async (p: Poll) => {
    setBusy(p.id);
    try {
      const res = await fetch(`/api/polls/${p.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Санал асуулга зогслоо");
    } catch {
      toast.error("Зогсооход алдаа гарлаа");
    }
    await load();
    setBusy(null);
  };

  const remove = async (p: Poll) => {
    if (!confirm("Энэ санал асуулгыг устгах уу?")) return;
    await fetch(`/api/polls/${p.id}`, { method: "DELETE" }).catch(() => null);
    setPolls((prev) => prev.filter((x) => x.id !== p.id));
  };

  const active = polls.filter(isOpen);
  const finished = polls.filter((p) => !isOpen(p));

  const renderPoll = (p: Poll) => {
    const open = isOpen(p);
    // Санал өгсөн эсвэл дууссан бол үр дүнг харуулна
    const showResults = !open || p.myVote !== null || isAdmin;
    const max = Math.max(...p.counts, 0);
    const left = new Date(p.endsAt).getTime() - serverNow;

    return (
      <div key={p.id}
        className={`rounded-3xl border p-4 space-y-3 ${open ? "border-accent/40 bg-accent/5" : "border-border-subtle bg-surface-elevated"}`}>
        <div className="flex items-start gap-2">
          <p className="flex-1 font-black text-[15px] leading-snug">{p.question}</p>
          {open ? (
            <span className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-black tabular-nums
              ${left < 30_000 ? "bg-red-500/15 text-red-400" : "bg-accent/15 text-accent"}`}>
              <Clock size={12} /> {formatLeft(left)}
            </span>
          ) : (
            <span className="shrink-0 px-2 py-1 rounded-xl text-[10px] font-bold bg-surface border border-border text-on-surface-muted">
              Дууссан
            </span>
          )}
        </div>

        <div className="space-y-2">
          {p.options.map((opt, i) => {
            const count = p.counts[i] ?? 0;
            const pct = p.total ? Math.round((count / p.total) * 100) : 0;
            const mine = p.myVote === i;
            const winner = !open && count > 0 && count === max;
            return (
              <div key={i}>
                <button
                  onClick={() => vote(p, i)}
                  disabled={!open || busy === p.id}
                  className={`relative w-full overflow-hidden text-left rounded-2xl border px-3.5 py-3 text-sm font-bold
                    transition-all ${open ? "active:scale-[0.98] hover:border-accent/50" : "cursor-default"}
                    ${mine ? "border-accent bg-accent/10" : "border-border bg-surface"}`}
                >
                  {showResults && (
                    <span
                      className={`absolute inset-y-0 left-0 transition-all duration-500 ${winner ? "bg-emerald-500/20" : "bg-accent/15"}`}
                      style={{ width: `${pct}%` }}
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    <span className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center
                      ${mine ? "border-accent bg-accent" : "border-border"}`}>
                      {mine && <Check size={11} className="text-white" strokeWidth={3} />}
                    </span>
                    <span className="flex-1 min-w-0 break-words">{opt}</span>
                    {winner && <span className="text-xs">🏆</span>}
                    {showResults && (
                      <span className="shrink-0 text-xs tabular-nums text-on-surface-muted">
                        {pct}% <span className="opacity-60">({count})</span>
                      </span>
                    )}
                  </span>
                </button>
                {isAdmin && showVoters === p.id && (p.voters?.[i]?.length ?? 0) > 0 && (
                  <p className="text-[10px] text-on-surface-muted px-3 pt-1">{p.voters![i].join(", ")}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-on-surface-muted">
          <BarChart3 size={12} />
          <span>{p.total} санал</span>
          {open && p.myVote === null && <span className="text-accent font-bold">• Сонголтоо дарна уу</span>}
          {open && p.myVote !== null && <span>• Дуусахаас өмнө сольж болно</span>}
          <span className="ml-auto" />
          {isAdmin && (
            <>
              <button onClick={() => setShowVoters(showVoters === p.id ? null : p.id)}
                className="px-2 py-1 rounded-lg hover:bg-card-hover font-bold">
                {showVoters === p.id ? "Нуух" : "Хэн юу сонгосон"}
              </button>
              {open ? (
                <button onClick={() => stop(p)} disabled={busy === p.id}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-500/15 text-red-400 font-black
                    hover:bg-red-500/25 active:scale-95 disabled:opacity-50">
                  <Square size={11} className="fill-current" /> Зогсоох
                </button>
              ) : (
                <button onClick={() => remove(p)} aria-label="Устгах"
                  className="p-1.5 rounded-lg hover:bg-red-500/10">
                  <Trash2 size={13} className="text-red-400" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      <AppHeader title="Санал асуулга" subtitle={active.length ? `${active.length} идэвхтэй` : undefined} />

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        {/* Админ — шинэ санал асуулга */}
        {isAdmin && (
          <div className="rounded-3xl border border-border bg-surface-elevated p-4 space-y-3">
            <p className="text-xs font-black text-on-surface-muted uppercase tracking-wide">Шинэ санал асуулга</p>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={200}
              placeholder="Асуултаа бичнэ үү..."
              className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/30"
            />
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={o}
                    onChange={(e) => setOptions((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                    maxLength={80}
                    placeholder={`Хариулт ${i + 1}`}
                    className="flex-1 min-w-0 bg-surface border border-border rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  {options.length > 2 && (
                    <button onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                      aria-label="Хасах" className="w-10 shrink-0 rounded-2xl border border-border hover:bg-card-hover flex items-center justify-center">
                      <X size={14} className="text-on-surface-muted" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              {options.length < MAX_OPTIONS && (
                <button onClick={() => setOptions((prev) => [...prev, ""])}
                  className="flex items-center gap-1 px-3 py-2.5 rounded-2xl border border-dashed border-border text-xs font-bold text-on-surface-muted hover:bg-card-hover">
                  <Plus size={13} /> Хариулт нэмэх
                </button>
              )}
              <button onClick={create} disabled={creating}
                className="ml-auto flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-accent text-white text-sm font-black
                  hover:opacity-90 active:scale-95 disabled:opacity-50">
                {creating ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
                Эхлүүлэх (3 мин)
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-3xl" />)}
          </div>
        ) : polls.length === 0 ? (
          <div className="text-center py-16 text-on-surface-muted text-sm">
            <BarChart3 size={32} className="mx-auto mb-3 opacity-40" />
            Одоогоор санал асуулга алга
          </div>
        ) : (
          <>
            {active.length > 0 && <div className="space-y-3">{active.map(renderPoll)}</div>}
            {finished.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-black text-on-surface-muted uppercase tracking-wide pt-2">Өмнөх санал асуулгууд</p>
                {finished.map(renderPoll)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
