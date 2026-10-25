"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lightbulb, Loader2, Send, Trash2, Check, Eye } from "lucide-react";
import AppHeader from "@/app/_components/AppHeader";
import { useMyRoles } from "@/app/_components/useMyRoles";
import { canSuggest } from "@/lib/suggestions";

type U = { name: string; fullName: string | null; avatar: string | null };
type Item = {
  id: string;
  userName: string;
  text: string;
  status: "NEW" | "SEEN" | "DONE";
  adminNote: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<Item["status"], string> = { NEW: "Шинэ", SEEN: "Харсан", DONE: "Хийгдсэн" };
const STATUS_COLOR: Record<Item["status"], string> = {
  NEW: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  SEEN: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  DONE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "дөнгөж сая";
  if (m < 60) return `${m} мин өмнө`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} цаг өмнө`;
  return `${Math.floor(h / 24)} өдөр өмнө`;
}

export default function SuggestionsPage() {
  const router = useRouter();
  const { roles } = useMyRoles();
  const isAdmin = roles?.role === "ADMIN";
  const allowed = canSuggest(roles?.role);

  const [items, setItems] = useState<Item[] | null>(null);
  const [users, setUsers] = useState<U[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (roles && !allowed) router.replace("/");
  }, [roles, allowed, router]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/suggestions", { cache: "no-store" });
      if (!res.ok) return;
      const d = await res.json();
      if (Array.isArray(d)) setItems(d);
      else {
        setItems(d.items ?? []);
        setUsers(d.users ?? []);
      }
    } catch { /* */ }
  }, []);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  const nameOf = (n: string) => users.find((u) => u.name === n)?.fullName || n;

  const submit = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error);
      setText("");
      ta.current?.blur();
      toast.success("Илгээлээ! Админ харах болно 👍");
      load();
    } catch (e) {
      toast.error((e as Error).message || "Илгээж чадсангүй");
    } finally {
      setSending(false);
    }
  };

  const setStatus = async (id: string, status: Item["status"]) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/suggestions/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) => prev?.map((i) => (i.id === id ? { ...i, status } : i)) ?? null);
    } catch {
      toast.error("Шинэчилж чадсангүй");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Энэ санал хүсэлтийг устгах уу?")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/suggestions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems((prev) => prev?.filter((i) => i.id !== id) ?? null);
    } catch {
      toast.error("Устгаж чадсангүй");
    } finally {
      setBusy(null);
    }
  };

  if (!roles || !allowed) return <div className="min-h-screen bg-surface" />;

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      <AppHeader
        title="Санал хүсэлт"
        subtitle={isAdmin ? "Бүх санал хүсэлт" : "Юу хиилгэх, засуулахыг хүсэж байна вэ?"}
        icon={
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
            <Lightbulb size={15} className="text-white" />
          </span>
        }
      />

      <div className="px-3 py-4 sm:p-6">
        <div className="max-w-xl mx-auto space-y-4">
          {/* Бичих хэсэг — админ ч бас өөрийн саналаа илгээж болно */}
          <div className="bg-surface-elevated border border-border rounded-3xl p-4">
            <textarea
              ref={ta}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Жишээ: сайт дээр ... хиймээр байна, эсвэл ... засагдвал зохимоор байна…"
              rows={3}
              maxLength={1000}
              className="w-full resize-none rounded-2xl bg-surface-alt border border-border-subtle px-3.5 py-3 text-sm outline-none focus:border-accent/50"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-on-surface-muted">{text.length}/1000</span>
              <button
                onClick={submit}
                disabled={!text.trim() || sending}
                className="px-4 h-10 rounded-2xl bg-accent text-white font-black text-sm flex items-center gap-1.5 disabled:opacity-40 active:scale-95"
              >
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Илгээх
              </button>
            </div>
          </div>

          {!isAdmin && items && items.length > 0 && (
            <p className="text-xs uppercase tracking-widest text-on-surface-muted font-bold px-1">Миний илгээсэн</p>
          )}

          {!items ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="animate-spin text-on-surface-muted" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-sm text-on-surface-muted py-10">Одоогоор санал хүсэлт алга</p>
          ) : (
            <div className="space-y-2.5">
              {items.map((it) => (
                <div key={it.id} className="bg-surface-elevated border border-border rounded-2xl p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-on-surface-muted truncate">
                      {isAdmin ? nameOf(it.userName) : timeAgo(it.createdAt)}
                    </p>
                    <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full border ${STATUS_COLOR[it.status]}`}>
                      {STATUS_LABEL[it.status]}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm whitespace-pre-wrap leading-snug">{it.text}</p>
                  {isAdmin && <p className="mt-1 text-[10px] text-on-surface-muted">{timeAgo(it.createdAt)}</p>}

                  {isAdmin && (
                    <div className="mt-3 flex gap-1.5">
                      {it.status !== "SEEN" && (
                        <button
                          onClick={() => setStatus(it.id, "SEEN")}
                          disabled={busy === it.id}
                          className="flex-1 h-8 rounded-xl border border-border text-xs font-bold flex items-center justify-center gap-1 active:scale-95"
                        >
                          <Eye size={13} /> Харсан
                        </button>
                      )}
                      {it.status !== "DONE" && (
                        <button
                          onClick={() => setStatus(it.id, "DONE")}
                          disabled={busy === it.id}
                          className="flex-1 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1 active:scale-95"
                        >
                          <Check size={13} /> Хийгдсэн
                        </button>
                      )}
                      <button
                        onClick={() => remove(it.id)}
                        disabled={busy === it.id}
                        aria-label="Устгах"
                        className="w-8 h-8 rounded-xl border border-border text-rose-400 flex items-center justify-center active:scale-95"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                  {!isAdmin && it.status === "NEW" && (
                    <button
                      onClick={() => remove(it.id)}
                      disabled={busy === it.id}
                      className="mt-2.5 text-xs text-rose-400 font-bold flex items-center gap-1 active:scale-95"
                    >
                      <Trash2 size={12} /> Устгах
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
