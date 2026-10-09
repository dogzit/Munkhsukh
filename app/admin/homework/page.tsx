"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Plus,
  ChevronRight,
  Loader2,
  BookOpen,
} from "lucide-react";

type HworkItem = {
  id: string;
  subject: string;
  title: string;
  date: string;
  image: string | null;
  images?: string[] | null;
};

function ymd(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  return ["Ням", "Дав", "Мяг", "Лха", "Пүр", "Баа", "Бям"][
    new Date(ymdStr + "T00:00:00").getDay()
  ];
}
function getImages(x: HworkItem): string[] {
  const arr = Array.isArray(x.images) ? x.images.filter(Boolean) : [];
  const one =
    typeof x.image === "string" && x.image.trim() ? [x.image.trim()] : [];
  return Array.from(new Set([...arr, ...one]));
}

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
    gradient: "from-slate-500 to-gray-500",
    text: "text-gray-400",
    bg: "bg-gray-500/10",
    border: "border-gray-500/20",
  },
};
const sc = (s: string) => SUBJECT_COLORS[s] || SUBJECT_COLORS.default;

export default function AdminHomeworkListPage() {
  const router = useRouter();
  // /admin/homework эсвэл ангийн даргын /manage/homework аль алинд нь ажиллана
  const base = usePathname().startsWith("/manage") ? "/manage" : "/admin";
  const [data, setData] = useState<HworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("ALL");

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

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return data.filter((x) => {
      const ok = subjectFilter === "ALL" || x.subject === subjectFilter;
      if (!ok) return false;
      if (!qq) return true;
      return `${x.subject} ${x.title}`.toLowerCase().includes(qq);
    });
  }, [data, q, subjectFilter]);

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
      if (!res.ok) throw new Error();
      const json = (await res.json()) as HworkItem[];
      setData(json);
      if (silent)
        toast.success(`Шинэчлэгдлээ • ${json.length} даалгавар`, {
          duration: 2000,
        });
    } catch {
      toast.error("Ачааллахад алдаа гарлаа");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  return (
    <div className="min-h-screen bg-surface text-on-surface p-6 font-sans">
      <div className="fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-0 -left-4 w-80 h-80 bg-violet-900 rounded-full mix-blend-multiply filter blur-[140px] opacity-25 animate-pulse" />
        <div
          className="absolute bottom-0 -right-4 w-80 h-80 bg-indigo-900 rounded-full mix-blend-multiply filter blur-[140px] opacity-20 animate-pulse"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={() => router.push(base === "/manage" ? "/" : "/admin")}
            className="p-2 hover:bg-card-hover rounded-full transition-all duration-200 hover:scale-110 active:scale-95 group"
          >
            <ArrowLeft
              size={22}
              className="group-hover:text-violet-400 transition-colors"
            />
          </button>
          <div className="text-right">
            <h1 className="text-xl font-bold text-on-surface">Даалгаврын хуваарь</h1>
            <p className="text-gray-600 text-xs mt-0.5">Өдрөөр бүлэглэсэн</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-surface-elevated border border-border-subtle rounded-2xl p-4 mb-5 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Хайх..."
                className="w-full pl-8 pr-4 py-2.5 bg-surface-elevated border border-border-subtle rounded-xl text-sm text-on-surface placeholder:text-on-surface-muted/50
                  outline-none focus:ring-1 focus:ring-white/20 hover:border-white/15 transition-all"
              />
            </div>
            <button
              onClick={() => fetchAll(true)}
              disabled={refreshing}
              className="px-3 py-2.5 rounded-xl bg-surface-elevated border border-border-subtle text-gray-500 hover:bg-card-hover hover:text-on-surface-muted hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
            >
              <RefreshCw
                size={13}
                className={refreshing ? "animate-spin" : ""}
              />
            </button>
            <button
              onClick={() => {
                toast.info("Даалгавар нэмэх...", { duration: 800 });
                setTimeout(() => router.push(`${base}/homework/add`), 300);
              }}
              className="px-3 py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/30 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={13} />
            </button>
          </div>
          {/* Subject filter pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {subjects.map((s) => {
              const active = subjectFilter === s;
              const c = sc(s);
              return (
                <button
                  key={s}
                  onClick={() => setSubjectFilter(s)}
                  className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-[10px] font-bold border transition-all duration-150 flex-shrink-0 hover:scale-105 active:scale-95
                    ${
                      active
                        ? `bg-gradient-to-r ${c.gradient} text-white border-transparent shadow-md`
                        : "bg-white/[0.03] border-border-subtle text-gray-500 hover:bg-card-hover hover:text-on-surface-muted"
                    }`}
                >
                  {s === "ALL" ? "Бүгд" : s}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-600">
            {groupedByDate.length} өдөр • {filtered.length} даалгавар
          </p>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-violet-500" size={28} />
            <p className="text-gray-600 text-sm">Ачаалж байна...</p>
          </div>
        ) : groupedByDate.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.02] border border-border-subtle rounded-2xl">
            <div className="text-4xl mb-3 opacity-30">📭</div>
            <p className="text-gray-600 text-sm">Даалгавар олдсонгүй</p>
          </div>
        ) : (
          <div className="space-y-2">
            {groupedByDate.map(([dateKey, items]) => {
              const preview = items.find((x) => getImages(x).length > 0);
              const previewImg = preview ? getImages(preview)[0] : null;
              const subjectSet = Array.from(
                new Set(items.map((x) => x.subject).filter(Boolean)),
              );

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => {
                    toast.info(`${formatDateDisplay(dateKey)}...`, {
                      duration: 800,
                    });
                    setTimeout(
                      () => router.push(`${base}/homework/${dateKey}`),
                      300,
                    );
                  }}
                  className="w-full text-left group rounded-2xl border border-border-subtle bg-white/[0.03]
                    hover:bg-card-hover hover:border-white/15 hover:scale-[1.005]
                    active:scale-[0.998] transition-all duration-200 overflow-hidden"
                >
                  <div className="flex items-stretch">
                    {/* Date badge */}
                    <div className="w-16 flex-shrink-0 bg-gradient-to-b from-violet-600/15 to-indigo-600/15 border-r border-white/5 flex flex-col items-center justify-center py-4 gap-0.5">
                      <span className="text-2xl font-black text-on-surface leading-none">
                        {dateKey.split("-")[2]}
                      </span>
                      <span className="text-[9px] font-bold text-violet-400/70 uppercase tracking-wide">
                        {getDayOfWeek(dateKey)}
                      </span>
                      <span className="text-[8px] text-gray-700">
                        {dateKey.split("-")[1]}-р сар
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 px-4 py-3 min-w-0">
                      <p className="text-[10px] text-gray-600 mb-1.5">
                        {formatDateDisplay(dateKey)}
                      </p>
                      {/* Subject pills */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {subjectSet.slice(0, 4).map((s) => {
                          const c = sc(s);
                          return (
                            <span
                              key={s}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${c.bg} ${c.text} ${c.border}`}
                            >
                              <span
                                className={`w-1 h-1 rounded-full bg-gradient-to-r ${c.gradient}`}
                              />
                              {s}
                            </span>
                          );
                        })}
                        {subjectSet.length > 4 && (
                          <span className="text-[9px] text-gray-600">
                            +{subjectSet.length - 4}
                          </span>
                        )}
                      </div>
                      {/* Task preview */}
                      <div className="space-y-0.5">
                        {items.slice(0, 2).map((item) => (
                          <p
                            key={item.id}
                            className="text-[11px] text-gray-500 truncate group-hover:text-gray-400 transition-colors"
                          >
                            {item.title}
                          </p>
                        ))}
                        {items.length > 2 && (
                          <p className="text-[10px] text-gray-700">
                            +{items.length - 2} даалгавар...
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Preview img + arrow */}
                    <div className="flex items-center gap-2 pr-3 flex-shrink-0">
                      {previewImg && (
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-border group-hover:border-white/20 transition-colors">
                          <img
                            src={previewImg}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <ChevronRight
                        size={14}
                        className="text-gray-700 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all duration-200"
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
  );
}
