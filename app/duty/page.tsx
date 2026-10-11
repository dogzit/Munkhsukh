"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type DutySchedule = {
  id: string;
  date: string; // ISO string
  names: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

function toInputDateLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoToInputDateUTC(iso: string) {
  // DB-д date-г UTC midnight гэж хадгалсан учраас UTC-аар YYYY-MM-DD гаргана
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function prettyFromInputDate(input: string) {
  const [y, m, d] = input.split("-");
  return `${y}.${m}.${d}`;
}

export default function DutyUserPage() {
  const [items, setItems] = useState<DutySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);


  const today = useMemo(() => toInputDateLocal(new Date()), []);

  async function load() {
    setIsLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/duty", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setItems(data as DutySchedule[]);
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => a.date.localeCompare(b.date));
  }, [items]);

  const todaysEntry = useMemo(() => {
    // item.date нь UTC шөнө 00:00 гэж хадгалагдсан -> UTC-р YYYY-MM-DD болгож today(локал)-той харьцуулна
    return sorted.find((x) => isoToInputDateUTC(x.date) === today) || null;
  }, [sorted, today]);

  const nextUpcoming = useMemo(() => {
    // өнөөдөр байхгүй бол хамгийн ойрын ирээдүйн өдөр
    return sorted.find((x) => isoToInputDateUTC(x.date) > today) || null;
  }, [sorted, today]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-28 -left-28 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="absolute top-1/3 -right-28 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-3 rounded-2xl bg-surface-elevated px-4 py-2 ring-1 ring-white/10 backdrop-blur transition hover:bg-card-hover"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-card-hover ring-1 ring-white/15">
            ←
          </span>
          <span className="font-semibold">Буцах</span>
        </Link>

        <button
          type="button"
          onClick={load}
          className="rounded-2xl bg-surface-elevated px-4 py-2 font-semibold ring-1 ring-white/10 backdrop-blur transition hover:bg-card-hover"
        >
          ↻ Шинэчлэх
        </button>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            🧹 Өнөөдрийн жижүүр
          </h1>
          <p className="mt-2 text-white/70">
            Өнөөдөр:{" "}
            <span className="font-semibold text-white">
              {prettyFromInputDate(today)}
            </span>
          </p>
        </div>

        {err && (
          <div className="mb-6 rounded-3xl border border-rose-200/30 bg-rose-500/10 px-5 py-4 text-rose-200">
            <div className="font-bold">Алдаа:</div>
            <div className="mt-1 text-sm">{err}</div>
          </div>
        )}

        {isLoading ? (
          <div className="rounded-3xl border border-border bg-surface-elevated p-8 text-center text-white/70 backdrop-blur">
            Уншиж байна...
          </div>
        ) : (
          <>
            {/* Today card */}
            {todaysEntry ? (
              <DutyCard
                title="Өнөөдрийн жижүүрүүд"
                badge="TODAY"
                dateLabel={prettyFromInputDate(today)}
                names={todaysEntry.names}
                notes={todaysEntry.notes}
                accent="from-emerald-500 via-teal-500 to-cyan-600"
              />
            ) : (
              <div className="rounded-3xl border border-border bg-surface-elevated p-8 backdrop-blur">
                <div className="text-xl font-extrabold">
                  Өнөөдөр жижүүр бүртгэгдээгүй байна 😅
                </div>
                <p className="mt-2 text-white/70">
                  Админ дээр өнөөдрийн бүртгэл нэмэгдээгүй эсвэл огноо нь өөр
                  байна.
                </p>

                {nextUpcoming ? (
                  <div className="mt-6">
                    <DutyCard
                      title="Дараагийн хамгийн ойрын жижүүр"
                      badge="NEXT"
                      dateLabel={prettyFromInputDate(
                        isoToInputDateUTC(nextUpcoming.date),
                      )}
                      names={nextUpcoming.names}
                      notes={nextUpcoming.notes}
                      accent="from-blue-600 via-indigo-600 to-purple-600"
                    />
                  </div>
                ) : (
                  <div className="mt-4 text-white/70">
                    Одоогоор ирээдүйн бүртгэл ч алга байна.
                  </div>
                )}
              </div>
            )}

            {/* Optional: show all */}
            <div className="mt-10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-white/90">
                  Бүх өдрүүд
                </h2>
                <span className="rounded-full bg-surface-elevated px-3 py-1 text-sm ring-1 ring-white/10">
                  {sorted.length} бүртгэл
                </span>
              </div>

              {sorted.length === 0 ? (
                <div className="mt-4 rounded-3xl border border-border bg-surface-elevated p-8 text-white/70 backdrop-blur">
                  Одоогоор бүртгэл алга байна.
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-5">
                  {sorted.map((x) => (
                    <div
                      key={x.id}
                      className="rounded-3xl border border-border bg-surface-elevated p-6 backdrop-blur"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="inline-flex items-center gap-2 rounded-full bg-surface-elevated px-4 py-2 ring-1 ring-white/10">
                            <span className="font-extrabold">
                              📅{" "}
                              {prettyFromInputDate(isoToInputDateUTC(x.date))}
                            </span>
                          </div>

                          {x.notes && (
                            <div className="mt-3 rounded-2xl bg-surface-elevated px-4 py-3 text-sm text-white/80 ring-1 ring-white/10">
                              <span className="font-semibold">Тайлбар:</span>{" "}
                              {x.notes}
                            </div>
                          )}

                          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                            {x.names.map((n, i) => (
                              <div
                                key={i}
                                className="rounded-2xl bg-surface-elevated px-4 py-3 ring-1 ring-white/10"
                              >
                                <div className="text-xs text-white/60">
                                  #{i + 1}
                                </div>
                                <div className="font-bold truncate">{n}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="text-sm text-white/60">
                          {isoToInputDateUTC(x.date) === today
                            ? "✅ Өнөөдөр"
                            : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function DutyCard({
  title,
  badge,
  dateLabel,
  names,
  notes,
  accent,
}: {
  title: string;
  badge: string;
  dateLabel: string;
  names: string[];
  notes: string | null;
  accent: string;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-surface-elevated shadow-2xl backdrop-blur">
      <div className={`bg-gradient-to-r ${accent} p-6`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-white/90">{title}</div>
            <div className="mt-1 text-2xl font-extrabold">{dateLabel}</div>
          </div>

          <span className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold ring-1 ring-white/20">
            {badge}
          </span>
        </div>
      </div>

      <div className="p-6">
        {notes && (
          <div className="mb-4 rounded-2xl bg-surface-elevated px-4 py-3 text-sm text-white/80 ring-1 ring-white/10">
            <span className="font-semibold">Тайлбар:</span> {notes}
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {names.map((n, i) => (
            <div
              key={i}
              className="rounded-2xl bg-surface-elevated px-4 py-3 ring-1 ring-white/10"
            >
              <div className="text-xs text-white/60">#{i + 1}</div>
              <div className="font-bold truncate">{n}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
