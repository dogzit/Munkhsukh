"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  RefreshCw,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CalendarDays,
  X,
} from "lucide-react";
import HomeworkCalendar from "@/app/_components/HomeworkCalendar";
import Skeleton from "@/app/_components/Skeleton";
import AppHeader from "@/app/_components/AppHeader";

type HworkItem = {
  id: string;
  title: string;
  subject: string;
  date: string;
  image: string | null;
  images?: string[] | null;
};

function ymd(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateDisplay(ymdStr: string) {
  const [year, month, day] = ymdStr.split("-");
  const months = [
    "1-р сар",
    "2-р сар",
    "3-р сар",
    "4-р сар",
    "5-р сар",
    "6-р сар",
    "7-р сар",
    "8-р сар",
    "9-р сар",
    "10-р сар",
    "11-р сар",
    "12-р сар",
  ];
  return `${year} оны ${months[parseInt(month) - 1]} ${parseInt(day)}`;
}

function getDayOfWeek(ymdStr: string) {
  const d = new Date(ymdStr + "T00:00:00");
  const days = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
  return days[d.getDay()];
}

function getImages(x: HworkItem): string[] {
  const arr = Array.isArray(x.images) ? x.images.filter(Boolean) : [];
  const one =
    typeof x.image === "string" && x.image.trim() ? [x.image.trim()] : [];
  return Array.from(new Set([...arr, ...one]));
}

// Subject accent colors (dark theme)
const SUBJECT_COLORS: Record<
  string,
  { gradient: string; text: string; bg: string; border: string }
> = {
  Математик: {
    gradient: "from-blue-500 to-cyan-500",
    text: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  Физик: {
    gradient: "from-violet-500 to-purple-500",
    text: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
  Хими: {
    gradient: "from-emerald-500 to-teal-500",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  Биологи: {
    gradient: "from-green-500 to-lime-500",
    text: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  "Англи хэл": {
    gradient: "from-rose-500 to-pink-500",
    text: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
  },
  "Монгол хэл": {
    gradient: "from-orange-500 to-amber-500",
    text: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  Түүх: {
    gradient: "from-amber-500 to-yellow-500",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  default: {
    gradient: "from-gray-500 to-slate-500",
    text: "text-gray-400",
    bg: "bg-gray-500/10",
    border: "border-gray-500/20",
  },
};

function getSubjectColor(subject: string) {
  return SUBJECT_COLORS[subject] || SUBJECT_COLORS.default;
}

function getWeekRange(weekOffset: number) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
}

function formatWeekLabel(weekOffset: number) {
  if (weekOffset === 0) return "Энэ долоо хоног";
  if (weekOffset === -1) return "Өмнөх долоо хоног";
  if (weekOffset === 1) return "Дараагийн долоо хоног";

  const { start, end } = getWeekRange(weekOffset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(start.getMonth() + 1)}/${pad(start.getDate())} - ${pad(end.getMonth() + 1)}/${pad(end.getDate())}`;
}

export default function HomeworkTimelinePage() {
  const router = useRouter();
  const [data, setData] = useState<HworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  const [weekOffset, setWeekOffset] = useState(0);
  // Хуанлиас сонгосон өдөр — сонгосон үед долоо хоногийн оронд тэр өдрийг харуулна
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const subjects = useMemo(() => {
    const s = new Set<string>();
    for (const x of data) s.add((x.subject || "").trim());
    return [
      "ALL",
      ...Array.from(s)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    ];
  }, [data]);

  const bySubject = useMemo(
    () => data.filter((x) => subjectFilter === "ALL" || x.subject === subjectFilter),
    [data, subjectFilter],
  );

  const dayCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const x of bySubject) {
      const k = ymd(x.date);
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [bySubject]);

  const filtered = useMemo(() => {
    if (selectedDate) return bySubject.filter((x) => ymd(x.date) === selectedDate);
    const { start, end } = getWeekRange(weekOffset);
    return bySubject.filter((x) => {
      const d = new Date(x.date);
      return d >= start && d <= end;
    });
  }, [bySubject, weekOffset, selectedDate]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, HworkItem[]> = {};
    for (const item of filtered) {
      const key = ymd(item.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const fetchAll = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/hwork", { cache: "no-store" });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const json = (await res.json()) as HworkItem[];
      setData(json);
      if (silent)
        toast.success("Даалгаврууд шинэчлэгдлээ ✨", { duration: 2000 });
    } catch (e) {
      console.error(e);
      toast.error("Даалгаврыг ачаалахад алдаа гарлаа");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const navigateToDate = (dateKey: string) => {
    router.push(`/homeWork/${dateKey}`);
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      {/* Header */}
      <AppHeader
        title="Даалгаврын хуваарь"
        subtitle="Өдрөөр бүлэглэсэн"
        icon={
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center shrink-0">
            <BookOpen size={15} className="text-white" />
          </span>
        }
      />

      <div className="px-3 py-4 sm:p-6">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-0 -left-4 w-80 h-80 bg-pink-600 rounded-full mix-blend-multiply filter blur-[140px] opacity-15 animate-pulse" />
        <div
          className="absolute bottom-0 -right-4 w-80 h-80 bg-orange-500 rounded-full mix-blend-multiply filter blur-[140px] opacity-15 animate-pulse"
          style={{ animationDelay: "1.5s" }}
        />
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-violet-600 rounded-full mix-blend-multiply filter blur-[160px] opacity-10" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="max-w-2xl lg:max-w-5xl mx-auto lg:flex lg:items-start lg:gap-6">
        {/* Хуанли — утсан дээр дээд талд, том дэлгэцэнд баруун талд */}
        <aside className="mb-4 sm:mb-6 lg:mb-0 lg:order-2 lg:w-80 lg:shrink-0 lg:sticky lg:top-20">
          <HomeworkCalendar
            counts={dayCounts}
            selected={selectedDate}
            onSelect={setSelectedDate}
          />
        </aside>

      <div className="flex-1 min-w-0 lg:order-1">
        {/* Filter + Refresh */}
        <div className="bg-surface-elevated border border-border backdrop-blur-xl rounded-3xl p-3.5 sm:p-4 mb-4 sm:mb-6 shadow-2xl">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
              Хичээл шүүх
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
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {subjects.map((s) => {
              const active = subjectFilter === s;
              const c = getSubjectColor(s);
              return (
                <button
                  key={s}
                  onClick={() => {
                    setSubjectFilter(s);
                    if (s !== "ALL")
                      toast.info(`${s} шүүж байна`, { duration: 1200 });
                  }}
                  className={`whitespace-nowrap rounded-2xl px-4 py-2 text-xs font-bold border transition-all duration-200
                    hover:scale-105 active:scale-95 flex-shrink-0
                    ${
                      active
                        ? `bg-gradient-to-r ${c.gradient} text-white border-transparent shadow-lg`
                        : "bg-surface-elevated border-border text-gray-400 hover:bg-card-hover hover:text-on-surface hover:border-white/20"
                    }`}
                >
                  {s === "ALL" ? "📚 Бүгд" : s}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <BookOpen size={12} className="text-gray-600" />
            <span className="text-xs text-gray-600">
              {groupedByDate.length} өдөр • {filtered.length} даалгавар
            </span>
          </div>
        </div>

        {/* Сонгосон өдөр */}
        {selectedDate ? (
          <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6 bg-surface-elevated border border-pink-500/30 backdrop-blur-xl rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-pink-500/15 flex items-center justify-center shrink-0">
                <CalendarDays size={15} className="text-pink-400" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-on-surface truncate">
                  {formatDateDisplay(selectedDate)}
                </p>
                <p className="text-[10px] text-gray-500">
                  {getDayOfWeek(selectedDate)} гараг • {filtered.length} даалгавар
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-on-surface-muted border border-border rounded-lg hover:bg-card-hover shrink-0"
            >
              <X size={12} /> Долоо хоног руу
            </button>
          </div>
        ) : (
        /* Week Navigation */
        <div className="flex items-center justify-between mb-4 sm:mb-6 bg-surface-elevated border border-border backdrop-blur-xl rounded-2xl px-2 sm:px-4 py-2 sm:py-3">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="p-2 hover:bg-card-hover rounded-xl transition-all hover:scale-110 active:scale-95"
          >
            <ChevronLeft size={18} className="text-gray-400" />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-on-surface">
              {formatWeekLabel(weekOffset)}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {(() => {
                const { start, end } = getWeekRange(weekOffset);
                const pad = (n: number) => String(n).padStart(2, "0");
                return `${start.getFullYear()}.${pad(start.getMonth() + 1)}.${pad(start.getDate())} — ${end.getFullYear()}.${pad(end.getMonth() + 1)}.${pad(end.getDate())}`;
              })()}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="px-2 py-1 text-[10px] font-bold text-pink-400 bg-pink-500/10 border border-pink-500/20 rounded-lg hover:bg-pink-500/20 transition-all"
              >
                Өнөөдөр
              </button>
            )}
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              className="p-2 hover:bg-card-hover rounded-xl transition-all hover:scale-110 active:scale-95"
            >
              <ChevronRight size={18} className="text-gray-400" />
            </button>
          </div>
        </div>

        )}

        {/* Timeline */}
        {loading ? (
          <div className="space-y-3 stagger-in">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-stretch rounded-2xl border border-border-subtle bg-white/[0.03] overflow-hidden">
                <div className="w-20 flex-shrink-0 flex flex-col items-center justify-center py-5 gap-1">
                  <Skeleton className="h-8 w-10 rounded-lg" />
                  <Skeleton className="h-3 w-12 rounded-md" />
                </div>
                <div className="flex-1 px-5 py-4 space-y-3">
                  <Skeleton className="h-3 w-32 rounded-md" />
                  <div className="flex gap-2"><Skeleton className="h-5 w-16 rounded-full" /><Skeleton className="h-5 w-14 rounded-full" /></div>
                  <div className="space-y-1.5"><Skeleton className="h-3 w-full rounded-md" /><Skeleton className="h-3 w-3/4 rounded-md" /></div>
                </div>
              </div>
            ))}
          </div>
        ) : groupedByDate.length === 0 ? (
          <div className="text-center py-20 bg-surface-elevated border border-border rounded-3xl">
            <div className="text-5xl mb-4 opacity-30">📭</div>
            <p className="text-gray-500">Даалгавар олдсонгүй</p>
            <p className="text-gray-600 text-sm mt-1">
              {selectedDate
                ? "Энэ өдөр даалгавар өгөөгүй байна"
                : "Сонгосон хичээлд даалгавар байхгүй байна"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedByDate.map(([dateKey, items], groupIdx) => {
              const subjectSet = new Set(
                items.map((x) => (x.subject || "").trim()).filter(Boolean),
              );
              const previewImg = items.find((x) => getImages(x).length > 0);
              const preview = previewImg ? getImages(previewImg)[0] : null;
              const dayLabel = getDayOfWeek(dateKey);
              const dayNum = dateKey.split("-")[2];

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => navigateToDate(dateKey)}
                  className="w-full text-left group rounded-2xl border border-border-subtle bg-white/[0.03]
                    hover:bg-card-hover hover:border-white/15 hover:scale-[1.01]
                    active:scale-[0.99] transition-all duration-200 overflow-hidden"
                >
                  <div className="flex items-stretch">
                    {/* Date badge — left column */}
                    <div className="w-16 sm:w-20 flex-shrink-0 bg-gradient-to-b from-pink-600/20 to-orange-600/20 border-r border-white/5 flex flex-col items-center justify-center py-4 sm:py-5 gap-1">
                      <span className="text-2xl sm:text-3xl font-black text-white leading-none">
                        {dayNum}
                      </span>
                      <span className="text-[10px] font-bold text-pink-400/80 uppercase tracking-wider">
                        {dayLabel}
                      </span>
                      <span className="text-[9px] text-gray-600 mt-0.5">
                        {dateKey.split("-")[1]}-р сар
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 px-3.5 sm:px-5 py-3.5 sm:py-4 min-w-0">
                      <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2.5 sm:mb-3">
                        <div className="min-w-0">
                          {/* Утсан дээр зүүн талын огноотой давхардах тул нууна */}
                          <p className="hidden sm:block text-xs text-gray-500 mb-1">
                            {formatDateDisplay(dateKey)}
                          </p>
                          {/* Subject pills */}
                          <div className="flex flex-wrap gap-1.5">
                            {Array.from(subjectSet)
                              .slice(0, 4)
                              .map((subj) => {
                                const c = getSubjectColor(subj);
                                return (
                                  <span
                                    key={subj}
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${c.bg} ${c.text} ${c.border}`}
                                  >
                                    {subj}
                                  </span>
                                );
                              })}
                            {subjectSet.size > 4 && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-surface-elevated text-gray-500 border-border">
                                +{subjectSet.size - 4}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Preview image */}
                        {preview && (
                          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-border flex-shrink-0 group-hover:border-white/20 transition-colors">
                            <img
                              src={preview}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                        )}
                      </div>

                      {/* Task list preview */}
                      <div className="space-y-1.5">
                        {items.slice(0, 2).map((item, i) => {
                          const c = getSubjectColor(item.subject);
                          return (
                            <div
                              key={item.id}
                              className="flex items-center gap-2"
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${c.gradient} flex-shrink-0`}
                              />
                              <p className="text-xs text-gray-400 truncate group-hover:text-on-surface-muted transition-colors">
                                {item.title}
                              </p>
                            </div>
                          );
                        })}
                        {items.length > 2 && (
                          <p className="text-[10px] text-gray-600 pl-3.5">
                            +{items.length - 2} дахь даалгавар...
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center pr-2 sm:pr-4">
                      <ChevronRight
                        size={16}
                        className="text-gray-600 group-hover:text-on-surface-muted group-hover:translate-x-0.5 transition-all duration-200"
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      </div>
      </div>
    </div>
  );
}
