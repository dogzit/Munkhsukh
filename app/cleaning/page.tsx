"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Plus, X, Loader2, Save, BellRing, CalendarCheck, Pencil } from "lucide-react";
import AppHeader from "@/app/_components/AppHeader";
import { useMyRoles } from "@/app/_components/useMyRoles";
import {
  DEFAULT_GROUPS,
  MAX_GROUPS,
  MAX_MEMBERS,
  canSeeCleaning,
  groupIndexFor,
  upcoming,
  weekday,
  type Roster,
} from "@/lib/cleaning";

type U = { name: string; fullName: string | null; avatar: string | null };
type Data = Roster & { today: string; users: U[] };

const DAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];

function dateLabel(ymd: string, today: string) {
  const [, m, d] = ymd.split("-");
  const base = `${+m}/${+d} ${DAYS[weekday(ymd)]}`;
  return ymd === today ? `Өнөөдөр • ${base}` : base;
}

function Avatar({ u, size = 28 }: { u: U | undefined; size?: number }) {
  const label = (u?.fullName || u?.name || "?")[0]?.toUpperCase();
  return (
    <span
      className="rounded-full overflow-hidden bg-accent/15 flex items-center justify-center text-accent text-[11px] font-black shrink-0"
      style={{ width: size, height: size }}
    >
      {u?.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : label}
    </span>
  );
}

export default function CleaningPage() {
  const router = useRouter();
  const { roles, isAdmin } = useMyRoles();
  const allowed = canSeeCleaning(roles?.role);

  const [data, setData] = useState<Data | null>(null);
  const [students, setStudents] = useState<U[]>([]);
  const [me, setMe] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Roster | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (roles && !allowed) router.replace("/");
  }, [roles, allowed, router]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/cleaning", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Хуваарийг ачаалж чадсангүй");
    }
  }, []);

  useEffect(() => {
    try {
      setMe(localStorage.getItem("name") ?? "");
    } catch { /* */ }
    if (allowed) load();
  }, [allowed, load]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/students")
      .then((r) => (r.ok ? r.json() : []))
      .then(setStudents)
      .catch(() => {});
  }, [isAdmin]);

  const userMap = useMemo(() => {
    const m = new Map<string, U>();
    for (const u of [...students, ...(data?.users ?? [])]) m.set(u.name, u);
    return m;
  }, [students, data]);
  const nameOf = (n: string) => userMap.get(n)?.fullName || n;

  if (!roles || !allowed) return <div className="min-h-screen bg-surface" />;

  const roster = editing && draft ? draft : data;
  const today = data?.today ?? "";
  const todayIdx = roster && today ? groupIndexFor(today, roster) : null;
  const next = roster && today ? upcoming(roster, today, Math.max(roster.groups.length, 1)) : [];
  const nextDuty = next.find((x) => x.date !== today) ?? null;
  const todayMembers = todayIdx !== null ? (roster?.groups[todayIdx] ?? []) : [];
  const iAmOnDuty = todayMembers.includes(me);
  const myNext = next.find((x) => roster?.groups[x.index]?.includes(me));

  const startEdit = () => {
    if (!data) return;
    setDraft({
      groups: data.groups.length ? data.groups.map((g) => [...g]) : Array.from({ length: DEFAULT_GROUPS }, () => []),
      anchorDate: data.anchorDate,
      anchorIndex: data.anchorIndex,
      skipWeekends: data.skipWeekends,
    });
    setEditing(true);
  };

  const assigned = new Set(draft?.groups.flat() ?? []);

  const setGroupCount = (n: number) =>
    setDraft((d) =>
      d && {
        ...d,
        groups: n > d.groups.length
          ? [...d.groups, ...Array.from({ length: n - d.groups.length }, () => [])]
          : d.groups.slice(0, n),
        anchorIndex: Math.min(d.anchorIndex, n - 1),
      },
    );

  const addMember = (gi: number, name: string) =>
    setDraft((d) => d && { ...d, groups: d.groups.map((g, i) => (i === gi ? [...g, name] : g)) });
  const removeMember = (gi: number, name: string) =>
    setDraft((d) => d && { ...d, groups: d.groups.map((g, i) => (i === gi ? g.filter((x) => x !== name) : g)) });
  // Өнөөдөр энэ бүлэг жижүүрлэнэ — тэндээс цааш дараалан явна
  const makeToday = (gi: number) => setDraft((d) => d && { ...d, anchorDate: today, anchorIndex: gi });

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch("/api/cleaning", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error);
      toast.success("Хуваарь хадгалагдлаа 🧹");
      setEditing(false);
      await load();
    } catch (e) {
      toast.error((e as Error).message || "Хадгалж чадсангүй");
    } finally {
      setSaving(false);
    }
  };

  const testPush = async () => {
    const res = await fetch("/api/cleaning/notify", { method: "POST" });
    if (res.ok) toast.success("Танд туршилтын мэдэгдэл явууллаа");
    else toast.error("Явуулж чадсангүй");
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      <AppHeader
        title="Цэвэрлэгээний жижүүр"
        subtitle="Өдөр өдрөөр ээлжилнэ"
        icon={
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shrink-0">
            <Sparkles size={15} className="text-white" />
          </span>
        }
      />

      <div className="px-3 py-4 sm:p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {!data ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="animate-spin text-on-surface-muted" />
            </div>
          ) : (
            <>
              {/* Өнөөдөр */}
              <div
                className={`rounded-3xl border p-4 sm:p-5 shadow-2xl ${
                  iAmOnDuty
                    ? "bg-emerald-500 border-emerald-400 text-white"
                    : todayIdx !== null
                      ? "bg-emerald-500/10 border-emerald-500/40"
                      : "bg-surface-elevated border-border"
                }`}
              >
                <p className={`text-[10px] uppercase tracking-widest font-bold ${iAmOnDuty ? "text-white/80" : "text-emerald-400"}`}>
                  {dateLabel(today, today)}
                </p>
                {todayIdx === null ? (
                  <>
                    <p className="text-lg font-black mt-1">Өнөөдөр цэвэрлэгээгүй 🎉</p>
                    {nextDuty && (
                      <p className="text-xs text-on-surface-muted mt-1">
                        Дараа нь: {dateLabel(nextDuty.date, today)} — {nextDuty.index + 1}-р бүлэг
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-lg sm:text-xl font-black mt-1">
                      {iAmOnDuty ? "🧹 Өнөөдөр чи цэвэрлэгээтэй!" : `Өнөөдөр ${todayIdx + 1}-р бүлэг цэвэрлэнэ`}
                    </p>
                    {todayMembers.length ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {todayMembers.map((n) => (
                          <div
                            key={n}
                            className={`flex items-center gap-2 rounded-2xl px-2.5 py-2 ${
                              iAmOnDuty ? "bg-white/20" : "bg-emerald-500/15"
                            } ${n === me ? "ring-2 ring-white" : ""}`}
                          >
                            <Avatar u={userMap.get(n)} />
                            <span className="text-sm font-bold truncate">{nameOf(n)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-on-surface-muted mt-2">Энэ бүлэгт хүн оруулаагүй байна</p>
                    )}
                  </>
                )}
                {!iAmOnDuty && myNext && (
                  <p className="mt-3 text-xs font-bold text-emerald-400">
                    Чиний ээлж: {dateLabel(myNext.date, today)}
                  </p>
                )}
              </div>

              {/* Админ: засах */}
              {isAdmin && !editing && (
                <div className="flex gap-2">
                  <button
                    onClick={startEdit}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent text-white text-sm font-black active:scale-[0.98]"
                  >
                    <Pencil size={15} /> Хуваарь засах
                  </button>
                  <button
                    onClick={testPush}
                    title="Өөртөө туршилтын мэдэгдэл явуулах"
                    className="px-4 flex items-center gap-2 rounded-2xl border border-border bg-surface-elevated text-xs font-bold active:scale-[0.98]"
                  >
                    <BellRing size={14} /> Турших
                  </button>
                </div>
              )}

              {editing && draft ? (
                <div className="space-y-3">
                  <div className="bg-surface-elevated border border-border rounded-3xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold">Бүлгийн тоо</span>
                      <select
                        value={draft.groups.length}
                        onChange={(e) => setGroupCount(Number(e.target.value))}
                        className="bg-surface-alt border border-border rounded-lg px-2 py-1.5 text-sm font-bold outline-none"
                      >
                        {Array.from({ length: MAX_GROUPS }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center justify-between gap-3 cursor-pointer">
                      <span className="text-sm font-bold">Бямба, ням гарагийг алгасах</span>
                      <input
                        type="checkbox"
                        checked={draft.skipWeekends}
                        onChange={(e) => setDraft({ ...draft, skipWeekends: e.target.checked })}
                        className="w-5 h-5 accent-emerald-500"
                      />
                    </label>
                    <p className="text-[11px] text-on-surface-muted leading-snug">
                      “Өнөөдөр” товч дарсан бүлгээс эхлээд өдөр бүр дараагийн бүлэг рүү шилжинэ. Сүүлийн бүлгийн
                      дараа 1-р бүлэг рүү буцна.
                    </p>
                  </div>

                  {draft.groups.map((g, gi) => {
                    const isToday = groupIndexFor(today, draft) === gi;
                    return (
                      <div
                        key={gi}
                        className={`rounded-3xl border p-4 ${isToday ? "border-emerald-500/50 bg-emerald-500/10" : "border-border bg-surface-elevated"}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <p className="font-black text-sm">
                            {gi + 1}-р бүлэг <span className="text-on-surface-muted font-bold text-xs">({g.length})</span>
                          </p>
                          <button
                            onClick={() => makeToday(gi)}
                            disabled={isToday}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                              isToday
                                ? "bg-emerald-500 text-white border-transparent"
                                : "border-border text-on-surface-muted hover:bg-card-hover"
                            }`}
                          >
                            <CalendarCheck size={12} /> {isToday ? "Өнөөдөр" : "Өнөөдөр болгох"}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {g.map((n) => (
                            <span key={n} className="flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-full bg-surface-alt border border-border">
                              <Avatar u={userMap.get(n)} size={22} />
                              <span className="text-xs font-bold max-w-[9rem] truncate">{nameOf(n)}</span>
                              <button onClick={() => removeMember(gi, n)} aria-label="Хасах" className="p-0.5 rounded-full hover:bg-card-hover">
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                          {g.length < MAX_MEMBERS && (
                            <label className="relative flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-border text-xs font-bold text-on-surface-muted">
                              <Plus size={12} /> Нэмэх
                              <select
                                value=""
                                onChange={(e) => e.target.value && addMember(gi, e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                aria-label={`${gi + 1}-р бүлэгт нэмэх`}
                              >
                                <option value="">Сонгох…</option>
                                {students
                                  .filter((s) => !assigned.has(s.name))
                                  .map((s) => (
                                    <option key={s.name} value={s.name}>{s.fullName || s.name}</option>
                                  ))}
                              </select>
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-4 flex gap-2">
                    <button
                      onClick={() => setEditing(false)}
                      className="px-5 py-3 rounded-2xl border border-border bg-surface-elevated text-sm font-bold"
                    >
                      Болих
                    </button>
                    <button
                      onClick={save}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 text-white text-sm font-black disabled:opacity-50 shadow-xl"
                    >
                      {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Хадгалах
                    </button>
                  </div>
                </div>
              ) : (
                /* Дараалал */
                <div className="bg-surface-elevated border border-border rounded-3xl p-4">
                  <p className="text-xs uppercase tracking-widest text-on-surface-muted font-semibold mb-3">Дараалал</p>
                  <ol className="space-y-2">
                    {next.map(({ date, index }) => {
                      const members = data.groups[index] ?? [];
                      const isToday = date === today;
                      const mine = members.includes(me);
                      return (
                        <li
                          key={date}
                          className={`rounded-2xl border px-3 py-2.5 ${
                            isToday ? "border-emerald-500/50 bg-emerald-500/15" : mine ? "border-accent/40 bg-accent/10" : "border-border-subtle"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-xs font-black ${isToday ? "text-emerald-400" : ""}`}>{dateLabel(date, today)}</span>
                            <span className="text-[10px] font-bold text-on-surface-muted">{index + 1}-р бүлэг</span>
                          </div>
                          <p className="text-xs text-on-surface-muted mt-1 leading-relaxed">
                            {members.length ? members.map(nameOf).join(", ") : "Хүн оруулаагүй"}
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
