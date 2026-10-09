"use client";
import { useRouter } from "next/navigation";
import { BookOpen, Clock, ArrowRight, MessageCircle, Newspaper, Users } from "lucide-react";
import { useEffect, useState } from "react";
import BusSeatPanel from "./_components/BusSeatPanel";
import AppHeader from "./_components/AppHeader";

const MON_DAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];

function getGreeting(hour: number) {
  if (hour < 6) return { text: "Сайн шөнө", emoji: "🌙", gradient: "from-indigo-500 to-purple-600" };
  if (hour < 12) return { text: "Өглөөний мэнд", emoji: "🌅", gradient: "from-orange-400 to-pink-500" };
  if (hour < 18) return { text: "Өдрийн мэнд", emoji: "☀️", gradient: "from-cyan-400 to-blue-500" };
  return { text: "Оройн мэнд", emoji: "🌆", gradient: "from-violet-500 to-purple-600" };
}

export default function HomePage() {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  // null = хараахан мэдэгдээгүй (юу ч рендэрлэхгүй)
  const [busEnabled, setBusEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    setNow(new Date());
    setMounted(true);
    const id = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBusEnabled(!!d?.busBookingEnabled))
      .catch(() => setBusEnabled(false));
  }, []);

  const greeting = now
    ? getGreeting(now.getHours())
    : { text: "Сайн уу", emoji: "🎓", gradient: "from-violet-500 to-cyan-500" };
  const dateStr = now ? `${MON_DAYS[now.getDay()]}, ${now.getMonth() + 1}/${now.getDate()}` : "";
  const timeStr = now
    ? `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    : "";

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      {/* Header */}
      <AppHeader
        showBack={false}
        title="Нүүр хуудас"
        subtitle={dateStr || "11A Анги"}
      />

      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-violet-600/20 to-purple-600/10 blur-[120px] animate-pulse" />
        <div
          className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-cyan-500/15 to-blue-500/10 blur-[120px] animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="max-w-lg mx-auto px-5 pt-6 pb-24">
        {/* Slim greeting */}
        <div
          className={`relative mb-6 transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-5">
            <div
              className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${greeting.gradient} rounded-full blur-[80px] opacity-20`}
            />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{greeting.emoji}</span>
                <div>
                  <h1 className="text-xl font-black tracking-tight">{greeting.text}</h1>
                  <p className="text-[10px] text-on-surface-muted uppercase tracking-widest font-bold">
                    11A Анги
                  </p>
                </div>
              </div>
              {timeStr && (
                <div className="text-right">
                  <p className="text-2xl font-black tabular-nums tracking-tighter leading-none">
                    {timeStr}
                  </p>
                  <p className="text-[10px] text-on-surface-muted font-medium mt-1 uppercase tracking-wider">
                    {dateStr}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions — 2 primary */}
        <div
          className={`grid grid-cols-2 gap-3 mb-6 transition-all duration-700 delay-100 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <button
            onClick={() => router.push("/homeWork")}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl
              p-4 text-left flex items-center gap-3
              hover:border-pink-500/30 hover:bg-pink-500/[0.04]
              active:scale-[0.97] transition-all duration-300"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <BookOpen size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm">Даалгавар</p>
              <p className="text-[10px] text-on-surface-muted">Шалгах</p>
            </div>
            <ArrowRight size={14} className="text-on-surface-muted/40 group-hover:text-on-surface-muted transition-colors" />
          </button>

          <button
            onClick={() => router.push("/timeTable")}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl
              p-4 text-left flex items-center gap-3
              hover:border-blue-500/30 hover:bg-blue-500/[0.04]
              active:scale-[0.97] transition-all duration-300"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Clock size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm">Хуваарь</p>
              <p className="text-[10px] text-on-surface-muted">Өнөөдрийн цаг</p>
            </div>
            <ArrowRight size={14} className="text-on-surface-muted/40 group-hover:text-on-surface-muted transition-colors" />
          </button>

          <button
            onClick={() => router.push("/branch")}
            className="col-span-2 group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl
              p-4 text-left flex items-center gap-3
              hover:border-violet-500/30 hover:bg-violet-500/[0.04]
              active:scale-[0.97] transition-all duration-300"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Users size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm">Миний салаа</p>
              <p className="text-[10px] text-on-surface-muted">Салааныхантайгаа даалгавраа хуваалцах</p>
            </div>
            <ArrowRight size={14} className="text-on-surface-muted/40 group-hover:text-on-surface-muted transition-colors" />
          </button>
        </div>

        {/* Bus booking panel — admin-аас асаах/унтраах боломжтой */}
        {busEnabled === true ? (
          <div
            className={`transition-all duration-700 delay-200 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <BusSeatPanel />
          </div>
        ) : busEnabled === false ? (
          <div
            className={`grid grid-cols-2 gap-3 transition-all duration-700 delay-200 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <button
              onClick={() => router.push("/chat")}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl
                p-4 text-left flex items-center gap-3
                hover:border-emerald-500/30 hover:bg-emerald-500/[0.04]
                active:scale-[0.97] transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <MessageCircle size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm">Ангийн чат</p>
                <p className="text-[10px] text-on-surface-muted">Мессеж бичих</p>
              </div>
              <ArrowRight size={14} className="text-on-surface-muted/40 group-hover:text-on-surface-muted transition-colors" />
            </button>

            <button
              onClick={() => router.push("/feed")}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl
                p-4 text-left flex items-center gap-3
                hover:border-orange-500/30 hover:bg-orange-500/[0.04]
                active:scale-[0.97] transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Newspaper size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm">Мэдээ</p>
                <p className="text-[10px] text-on-surface-muted">Самбар үзэх</p>
              </div>
              <ArrowRight size={14} className="text-on-surface-muted/40 group-hover:text-on-surface-muted transition-colors" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
