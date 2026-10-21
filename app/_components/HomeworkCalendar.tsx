"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function todayKey() {
  const t = new Date();
  return keyOf(t.getFullYear(), t.getMonth(), t.getDate());
}

/**
 * Даалгаврын хуанли — даалгавартай өдрүүдийг тэмдэглэж, өдөр сонгоход
 * тухайн өдрийн даалгаврыг харуулна. Сар/оноор шууд үсэрч болно.
 */
export default function HomeworkCalendar({
  counts,
  selected,
  onSelect,
}: {
  /** "YYYY-MM-DD" → тухайн өдрийн даалгаврын тоо */
  counts: Record<string, number>;
  selected: string | null;
  onSelect: (key: string | null) => void;
}) {
  const [view, setView] = useState(() => {
    const base = selected ? new Date(selected + "T00:00:00") : new Date();
    return { y: base.getFullYear(), m: base.getMonth() };
  });
  // Утсан дээр анхнаасаа хаалттай, том дэлгэцэнд үргэлж нээлттэй
  const [open, setOpen] = useState(false);

  const today = todayKey();

  const years = useMemo(() => {
    const ys = new Set<number>([new Date().getFullYear(), view.y]);
    for (const k of Object.keys(counts)) ys.add(Number(k.slice(0, 4)));
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }, [counts, view.y]);

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const lead = (first.getDay() + 6) % 7; // Даваа гаригаас эхэлнэ
    const days = new Date(view.y, view.m + 1, 0).getDate();
    const out: (number | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= days; d++) out.push(d);
    while (out.length % 7) out.push(null);
    return out;
  }, [view]);

  const monthTotal = useMemo(() => {
    const prefix = `${view.y}-${pad(view.m + 1)}-`;
    return Object.entries(counts).reduce((s, [k, n]) => (k.startsWith(prefix) ? s + n : s), 0);
  }, [counts, view]);

  const shift = (delta: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const goToday = () => {
    const t = new Date();
    setView({ y: t.getFullYear(), m: t.getMonth() });
    onSelect(today);
  };

  return (
    <div className="bg-surface-elevated border border-border rounded-3xl p-3.5 sm:p-4 shadow-2xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 lg:pointer-events-none"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-xs text-on-surface-muted uppercase tracking-widest font-semibold">
          <CalendarDays size={14} className="text-pink-400" />
          Хуанли
          {selected && (
            <span className="normal-case tracking-normal text-pink-400 font-bold lg:hidden">
              • {selected.replaceAll("-", ".")}
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={`text-on-surface-muted transition-transform lg:hidden ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div className={`${open ? "block" : "hidden"} lg:block mt-3`}>
        {/* Сар / он сонгох */}
        <div className="flex items-center gap-1.5 mb-3">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Өмнөх сар"
            className="p-1.5 rounded-lg hover:bg-card-hover active:scale-95"
          >
            <ChevronLeft size={16} className="text-on-surface-muted" />
          </button>
          <select
            value={view.m}
            onChange={(e) => setView((v) => ({ ...v, m: Number(e.target.value) }))}
            aria-label="Сар"
            className="flex-1 min-w-0 bg-surface-alt border border-border rounded-lg px-2 py-1.5 text-xs font-bold text-on-surface outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>
                {i + 1}-р сар
              </option>
            ))}
          </select>
          <select
            value={view.y}
            onChange={(e) => setView((v) => ({ ...v, y: Number(e.target.value) }))}
            aria-label="Он"
            className="w-[4.75rem] bg-surface-alt border border-border rounded-lg px-2 py-1.5 text-xs font-bold text-on-surface outline-none"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Дараагийн сар"
            className="p-1.5 rounded-lg hover:bg-card-hover active:scale-95"
          >
            <ChevronRight size={16} className="text-on-surface-muted" />
          </button>
        </div>

        {/* Гаригууд */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((w, i) => (
            <span
              key={w}
              className={`text-center text-[10px] font-bold ${i >= 5 ? "text-pink-400/70" : "text-on-surface-muted"}`}
            >
              {w}
            </span>
          ))}
        </div>

        {/* Өдрүүд */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <span key={`e${i}`} />;
            const k = keyOf(view.y, view.m, d);
            const n = counts[k] ?? 0;
            const isSel = selected === k;
            const isToday = today === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => onSelect(isSel ? null : k)}
                title={n ? `${n} даалгавар` : undefined}
                className={`relative h-9 lg:h-auto lg:aspect-square rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all active:scale-90
                  ${isSel
                    ? "bg-gradient-to-br from-pink-500 to-orange-500 text-white shadow-lg"
                    : n
                      ? "bg-pink-500/10 text-on-surface hover:bg-pink-500/20"
                      : "text-on-surface-muted hover:bg-card-hover"}
                  ${isToday && !isSel ? "ring-1 ring-pink-400" : ""}`}
              >
                {d}
                {n > 0 && (
                  <span
                    className={`absolute bottom-1 w-1 h-1 rounded-full ${isSel ? "bg-white" : "bg-pink-400"}`}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[10px] text-on-surface-muted">
            Энэ сард {monthTotal} даалгавар
          </span>
          <div className="flex gap-1.5">
            {selected && (
              <button
                type="button"
                onClick={() => onSelect(null)}
                className="px-2 py-1 text-[10px] font-bold rounded-lg border border-border text-on-surface-muted hover:bg-card-hover"
              >
                Цэвэрлэх
              </button>
            )}
            <button
              type="button"
              onClick={goToday}
              className="px-2 py-1 text-[10px] font-bold text-pink-400 bg-pink-500/10 border border-pink-500/20 rounded-lg hover:bg-pink-500/20"
            >
              Өнөөдөр
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
