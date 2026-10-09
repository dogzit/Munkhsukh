"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  RefreshCw,
  BookOpen,
  Clock,
  Coffee,
  CheckCircle2,
  CalendarDays,
  Loader2,
  ChevronDown,
  Filter,
} from "lucide-react";
import Skeleton from "@/app/_components/Skeleton";
import AppHeader from "@/app/_components/AppHeader";

type Day = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";
type TimetableItem = {
  id: string;
  day: Day;
  lessonNumber: number;
  subject: string;
  createdAt: string;
};
type HworkItem = {
  id: string;
  title: string;
  subject: string;
  date: string;
  image?: string | null;
  images?: string[] | null;
};
type Props = { endpoint?: string; title?: string; showBackButton?: boolean };

const DAYS_ORDER: Day[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
];
const DAY_LABELS: Record<Day, string> = {
  MONDAY: "Даваа",
  TUESDAY: "Мягмар",
  WEDNESDAY: "Лхагва",
  THURSDAY: "Пүрэв",
  FRIDAY: "Баасан",
};

function getTodayDay(): Day {
  const d = new Date().getDay();
  if (d === 1) return "MONDAY";
  if (d === 2) return "TUESDAY";
  if (d === 3) return "WEDNESDAY";
  if (d === 4) return "THURSDAY";
  if (d === 5) return "FRIDAY";
  return "MONDAY";
}

type Slot = { start: number; end: number; label: string };
// 8:00-оос эхэлж, хичээл бүр 40 мин, завсарлага 5 мин.
// 3-р цагийн дараа (10:10–10:20) 10 минутын их завсарлага, 13:15-д тарна.
const TIME_SLOTS: Slot[] = [
  { start: 8 * 60 + 0, end: 8 * 60 + 40, label: "08:00 – 08:40" },
  { start: 8 * 60 + 45, end: 9 * 60 + 25, label: "08:45 – 09:25" },
  { start: 9 * 60 + 30, end: 10 * 60 + 10, label: "09:30 – 10:10" },
  { start: 10 * 60 + 20, end: 11 * 60 + 0, label: "10:20 – 11:00" },
  { start: 11 * 60 + 5, end: 11 * 60 + 45, label: "11:05 – 11:45" },
  { start: 11 * 60 + 50, end: 12 * 60 + 30, label: "11:50 – 12:30" },
  { start: 12 * 60 + 35, end: 13 * 60 + 15, label: "12:35 – 13:15" },
];

function toHHMM(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function getCurrentLesson(): number | null {
  const cur = new Date().getHours() * 60 + new Date().getMinutes();
  for (let i = 0; i < TIME_SLOTS.length; i++)
    if (cur >= TIME_SLOTS[i].start && cur <= TIME_SLOTS[i].end) return i + 1;
  return null;
}

const LESSON_COLORS = [
  "from-emerald-500 to-cyan-500",
  "from-cyan-500 to-blue-500",
  "from-blue-500 to-violet-500",
  "from-violet-500 to-purple-500",
  "from-purple-500 to-pink-500",
  "from-pink-500 to-rose-500",
  "from-rose-500 to-orange-500",
];

function ymd(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function getDayOfWeekFromYmd(ymdStr: string) {
  return ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"][
    new Date(ymdStr + "T00:00:00").getDay()
  ];
}

// Per-row filter state stored in a map keyed by rowKey
type RowFilters = { dateFilter: string; dayFilter: string };

// Sub-component so each expanded row manages its own filter UI independently
function HomeworkPanel({
  subject,
  cachedHw,
  isCurrent,
  isLoading,
}: {
  subject: string;
  cachedHw: HworkItem[] | undefined;
  isCurrent: boolean;
  isLoading: boolean;
}) {
  const router = useRouter();
  const [dateFilter, setDateFilter] = useState("ALL");
  const [dayFilter, setDayFilter] = useState("ALL");

  const dates = useMemo(() => {
    if (!cachedHw) return [];
    return Array.from(new Set(cachedHw.map((hw) => ymd(hw.date)))).sort(
      (a, b) => b.localeCompare(a),
    );
  }, [cachedHw]);

  const days = useMemo(
    () => Array.from(new Set(dates.map((d) => getDayOfWeekFromYmd(d)))),
    [dates],
  );

  const filtered = useMemo(() => {
    if (!cachedHw) return [];
    return cachedHw.filter((hw) => {
      const d = ymd(hw.date);
      return (
        (dateFilter === "ALL" || d === dateFilter) &&
        (dayFilter === "ALL" || getDayOfWeekFromYmd(d) === dayFilter)
      );
    });
  }, [cachedHw, dateFilter, dayFilter]);

  const borderCls = isCurrent
    ? "border-yellow-400/40 bg-yellow-400/[0.03]"
    : "border-cyan-400/40 bg-cyan-400/[0.03]";

  return (
    <div
      className={`border border-t-0 rounded-b-2xl overflow-hidden ${borderCls}`}
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-3 py-6 text-gray-400">
          <Loader2 size={16} className="animate-spin text-cyan-500" />
          <span className="text-sm">Ачааллаж байна...</span>
        </div>
      ) : !cachedHw || cachedHw.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-3xl mb-2 opacity-40">✅</div>
          <p className="text-gray-500 text-sm">Даалгавар олдсонгүй</p>
          <p className="text-gray-600 text-xs mt-1">Та чөлөөтэй байна!</p>
        </div>
      ) : (
        <div className="px-4 pt-3 pb-4">
          {/* Filters — only show if there are multiple options */}
          {(days.length > 1 || dates.length > 1) && (
            <div className="mb-3 space-y-2">
              {days.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter size={10} className="text-gray-600 flex-shrink-0" />
                  <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">
                    Өдөр:
                  </span>
                  {["ALL", ...days].map((day) => (
                    <button
                      key={day}
                      onClick={() => setDayFilter(day)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all duration-150 hover:scale-105 active:scale-95
                        ${
                          dayFilter === day
                            ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400"
                            : "bg-surface-elevated border border-border text-gray-500 hover:bg-card-hover hover:text-on-surface-muted"
                        }`}
                    >
                      {day === "ALL" ? "Бүгд" : day}
                    </button>
                  ))}
                </div>
              )}
              {dates.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <CalendarDays
                    size={10}
                    className="text-gray-600 flex-shrink-0"
                  />
                  <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">
                    Огноо:
                  </span>
                  {["ALL", ...dates].map((date) => (
                    <button
                      key={date}
                      onClick={() => setDateFilter(date)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all duration-150 hover:scale-105 active:scale-95
                        ${
                          dateFilter === date
                            ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400"
                            : "bg-surface-elevated border border-border text-gray-500 hover:bg-card-hover hover:text-on-surface-muted"
                        }`}
                    >
                      {date === "ALL"
                        ? "Бүгд"
                        : date.slice(5).replace("-", "/")}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold px-1 mb-2">
            {subject} — {filtered.length}/{cachedHw.length} даалгавар
          </p>

          {filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-600 py-3">
              Шүүлтэнд тохирох даалгавар байхгүй
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.slice(0, 8).map((hw) => {
                const dateKey = ymd(hw.date);
                return (
                  <button
                    key={hw.id}
                    type="button"
                    onClick={() => {
                      toast.info(`${dateKey} харж байна...`, { duration: 900 });
                      setTimeout(
                        () => router.push(`/homeWork/${dateKey}`),
                        300,
                      );
                    }}
                    className="w-full text-left group/hw flex items-start gap-3 p-3 rounded-xl
                    bg-surface-elevated border border-border-subtle
                    hover:bg-white/[0.07] hover:border-violet-500/30 hover:pl-4
                    active:scale-[0.98] transition-all duration-150 cursor-pointer"
                  >
                    <div
                      className="w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/20
                    flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/hw:scale-110 group-hover/hw:bg-violet-500/20 transition-all"
                    >
                      <CheckCircle2 size={12} className="text-violet-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-on-surface group-hover/hw:text-white transition-colors leading-snug">
                        {hw.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {hw.date && (
                          <p className="text-[10px] text-gray-500">{dateKey}</p>
                        )}
                        <p className="text-[10px] text-gray-500">
                          {getDayOfWeekFromYmd(dateKey)}
                        </p>
                        <p className="text-[10px] text-violet-400/60 ml-auto group-hover/hw:text-violet-400 transition-colors">
                          Дэлгэрэнгүй →
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {filtered.length > 8 && (
                <p className="text-center text-xs text-gray-600 pt-1">
                  +{filtered.length - 8} дахь даалгавар...
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TimetableReadOnly({
  endpoint = "/api/timetable",
  title = "Хичээлийн хуваарь",
  showBackButton = true,
}: Props) {
  const [data, setData] = useState<TimetableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const today = useMemo(() => getTodayDay(), []);
  const [activeDay, setActiveDay] = useState<Day>(today);
  const [currentLesson, setCurrentLesson] = useState<number | null>(null);

  // expandedSet: keys are unique rowKeys
  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set());
  // homeworkCache: keyed by subject name (shared across same subject)
  const [homeworkCache, setHomeworkCache] = useState<
    Record<string, HworkItem[]>
  >({});
  const [loadingSet, setLoadingSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCurrentLesson(getCurrentLesson());
    const t = setInterval(() => setCurrentLesson(getCurrentLesson()), 60_000);
    return () => clearInterval(t);
  }, []);

  const grid = useMemo(() => {
    const m = new Map<string, TimetableItem>();
    for (const it of data) m.set(`${it.day}-${it.lessonNumber}`, it);
    return m;
  }, [data]);

  const fetchAll = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData(await res.json());
      if (silent) toast.success("Хуваарь шинэчлэгдлээ ✨", { duration: 2000 });
    } catch {
      toast.error("Хуваарийг ачаалахад алдаа гарлаа");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [endpoint]);

  const toggleLesson = async (rowKey: string, subject: string) => {
    if (expandedSet.has(rowKey)) {
      setExpandedSet((prev) => {
        const n = new Set(prev);
        n.delete(rowKey);
        return n;
      });
      return;
    }
    setExpandedSet((prev) => new Set([...prev, rowKey]));

    if (homeworkCache[subject] !== undefined) {
      const cached = homeworkCache[subject];
      if (cached.length === 0)
        toast.info(`${subject} дээр даалгавар олдсонгүй`, { duration: 2000 });
      else
        toast.success(`${cached.length} даалгавар олдлоо 📚`, {
          duration: 1500,
        });
      return;
    }
    setLoadingSet((prev) => new Set([...prev, rowKey]));
    toast.info(`${subject} — ачаалж байна...`, { duration: 1200 });
    try {
      const res = await fetch(
        `/api/hwork?subject=${encodeURIComponent(subject)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error();
      const json: HworkItem[] = await res.json();
      setHomeworkCache((prev) => ({ ...prev, [subject]: json }));
      if (json.length === 0)
        toast.info(`${subject} дээр даалгавар олдсонгүй`, { duration: 2500 });
      else
        toast.success(`${json.length} даалгавар олдлоо 📚`, { duration: 2000 });
    } catch {
      toast.error("Даалгаварыг ачаалахад алдаа гарлаа");
      setExpandedSet((prev) => {
        const n = new Set(prev);
        n.delete(rowKey);
        return n;
      });
    } finally {
      setLoadingSet((prev) => {
        const n = new Set(prev);
        n.delete(rowKey);
        return n;
      });
    }
  };

  const isToday = activeDay === today;
  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;

  const timelineRows = useMemo(() => {
    const rows: Array<
      | {
          type: "lesson";
          rowKey: string;
          lessonNumber: number;
          subject: string | null;
          timeLabel: string;
        }
      | { type: "break"; from: number; to: number; minutes: number }
    > = [];
    for (let i = 0; i < TIME_SLOTS.length; i++) {
      const ln = i + 1;
      const subject = grid.get(`${activeDay}-${ln}`)?.subject ?? null;
      // rowKey uses lesson slot index — unique even for duplicate subjects
      rows.push({
        type: "lesson",
        rowKey: `${activeDay}-slot${i}`,
        lessonNumber: ln,
        subject,
        timeLabel: TIME_SLOTS[i].label,
      });
      const cur = TIME_SLOTS[i],
        next = TIME_SLOTS[i + 1];
      if (next && next.start > cur.end)
        rows.push({
          type: "break",
          from: cur.end,
          to: next.start,
          minutes: next.start - cur.end,
        });
    }
    return rows;
  }, [activeDay, grid]);

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      {/* Header */}
      <AppHeader
        showBack={showBackButton}
        title={title}
        subtitle={
          isToday && !isWeekend && currentLesson
            ? `Одоо ${currentLesson}-р цаг явж байна`
            : "Долоо хоногийн хуваарь"
        }
        icon={
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
            <Clock size={15} className="text-white" />
          </span>
        }
      />

      <div className="p-6">
      <div className="fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-0 -left-4 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-[140px] opacity-15 animate-pulse" />
        <div
          className="absolute bottom-0 -right-4 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-[140px] opacity-15 animate-pulse"
          style={{ animationDelay: "1.5s" }}
        />
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-violet-600 rounded-full mix-blend-multiply filter blur-[160px] opacity-10" />
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Day Tabs */}
        <div className="bg-surface-elevated border border-border backdrop-blur-xl rounded-3xl p-4 mb-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
              Өдөр сонгох
            </span>
            <button
              onClick={() => fetchAll(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-elevated border border-border
                hover:bg-card-hover hover:border-white/20 hover:scale-105 active:scale-95
                transition-all duration-200 text-xs text-on-surface-muted
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <RefreshCw
                size={14}
                className={refreshing ? "animate-spin" : ""}
              />
              Шинэчлэх
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {DAYS_ORDER.map((d) => {
              const active = d === activeDay,
                isTodayDay = d === today;
              return (
                <button
                  key={d}
                  onClick={() => {
                    setActiveDay(d);
                    setExpandedSet(new Set());
                    toast.info(`${DAY_LABELS[d]} өдрийн хуваарь`, {
                      duration: 1500,
                    });
                  }}
                  className={`rounded-2xl px-3 py-2.5 text-sm font-bold transition-all duration-200 relative hover:scale-105 active:scale-95
                    ${
                      active
                        ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-900/40"
                        : "bg-surface-elevated border border-border text-gray-400 hover:bg-card-hover hover:text-on-surface hover:border-white/20"
                    }`}
                >
                  {DAY_LABELS[d]}
                  {isTodayDay && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lessons */}
        {loading ? (
          <div className="space-y-3 stagger-in">
            {[1,2,3,4,5,6,7].map(i => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border border-border-subtle rounded-2xl bg-white/[0.03]">
                <Skeleton className="w-11 h-11 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-28 rounded-lg" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
                <Skeleton className="w-4 h-4 rounded-md shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {timelineRows.map((row, idx) => {
              if (row.type === "break")
                return (
                  <div
                    key={`break-${idx}`}
                    className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all duration-200 group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Coffee size={16} className="text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-400/80 uppercase tracking-wider">
                        Завсарлага
                      </p>
                      <p className="text-xs text-gray-500">
                        {toHHMM(row.from)} – {toHHMM(row.to)} • {row.minutes}{" "}
                        мин
                      </p>
                    </div>
                    <span className="ml-auto text-xs text-amber-500/50">
                      ☕
                    </span>
                  </div>
                );

              const { rowKey, lessonNumber, subject, timeLabel } = row;
              const isCurrent =
                isToday && !isWeekend && currentLesson === lessonNumber;
              const isExpanded = expandedSet.has(rowKey);
              const isThisLoading = loadingSet.has(rowKey);
              const colorIdx = (lessonNumber - 1) % LESSON_COLORS.length;
              const cachedHw = subject ? homeworkCache[subject] : undefined;

              return (
                <div key={rowKey} className="rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      if (!subject) {
                        toast.warning("Энэ цагт хичээл тэмдэглэгдээгүй байна");
                        return;
                      }
                      toggleLesson(rowKey, subject);
                    }}
                    className={`w-full text-left border px-5 py-4 transition-all duration-200 hover:pl-6 group
                      ${isExpanded ? "rounded-t-2xl rounded-b-none" : "rounded-2xl"}
                      ${
                        isCurrent
                          ? "border-yellow-400/40 bg-yellow-400/5 shadow-lg shadow-yellow-900/20 ring-1 ring-yellow-400/20"
                          : isExpanded
                            ? "border-cyan-400/40 bg-cyan-400/5 border-b-0"
                            : "border-border-subtle bg-white/[0.03] hover:bg-card-hover hover:border-white/15"
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${LESSON_COLORS[colorIdx]}
                        flex items-center justify-center font-extrabold text-white text-lg shadow-lg
                        group-hover:scale-110 transition-transform duration-200
                        ${isCurrent ? "ring-2 ring-yellow-300/50" : ""}`}
                      >
                        {lessonNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-bold text-base truncate transition-colors duration-200
                          ${subject ? "text-on-surface group-hover:text-on-surface" : "text-gray-600 italic"}`}
                        >
                          {subject ?? "Тэмдэглээгүй"}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock size={11} className="text-gray-500" />
                          <span className="text-xs text-gray-500">
                            {timeLabel}
                          </span>
                          {isCurrent && (
                            <span className="text-xs font-bold text-yellow-400 animate-pulse">
                              • ОДОО
                            </span>
                          )}
                          {isExpanded && !isCurrent && (
                            <span className="text-xs font-bold text-cyan-400">
                              • Нээлттэй
                            </span>
                          )}
                        </div>
                      </div>
                      {subject &&
                        (isThisLoading ? (
                          <Loader2
                            size={16}
                            className="text-cyan-400 animate-spin flex-shrink-0"
                          />
                        ) : (
                          <ChevronDown
                            size={16}
                            className={`text-gray-600 group-hover:text-gray-400 transition-all duration-300 flex-shrink-0 ${isExpanded ? "rotate-180 text-cyan-400" : ""}`}
                          />
                        ))}
                    </div>
                  </button>

                  {/* Each expanded panel is its own component with isolated filter state */}
                  {isExpanded && subject && (
                    <HomeworkPanel
                      key={rowKey}
                      subject={subject}
                      cachedHw={cachedHw}
                      isCurrent={isCurrent}
                      isLoading={isThisLoading}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
