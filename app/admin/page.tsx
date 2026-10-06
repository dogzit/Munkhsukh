"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import LogoutConfirm from "@/app/_components/LogoutConfirm";
import AppHeader from "@/app/_components/AppHeader";
import Skeleton from "@/app/_components/Skeleton";
import {
  LogOut,
  Calendar,
  Plus,
  Edit3,
  ArrowRight,
  Bus,
  ScanLine,
  Users,
  BookOpen,
  Clock,
  Newspaper,
  MessageCircle,
  Bell,
  UserPlus,
} from "lucide-react";

type Stats = {
  cards: {
    users: number;
    admins: number;
    hworks: number;
    timetable: number;
    duty: number;
    posts: number;
    chats: number;
    pendingBus: number;
    notificationsToday: number;
  };
  pendingBookings: {
    seatId: string;
    userName: string;
    email: string;
    createdAt: string;
  }[];
  recentUsers: {
    name: string;
    fullName: string | null;
    avatar: string | null;
    role: string;
    createdAt: string;
  }[];
  recentHworks: { id: string; title: string; subject: string; date: string }[];
  recentChats: {
    id: string;
    userName: string;
    text: string;
    createdAt: string;
  }[];
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Сая";
  if (mins < 60) return `${mins}мн өмнө`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}цаг өмнө`;
  return `${Math.floor(hrs / 24)} өдөр өмнө`;
}

const NAV_CARDS = [
  {
    icon: <Calendar size={20} className="text-white" />,
    gradient: "from-blue-600 to-cyan-500",
    glow: "bg-blue-500",
    title: "Хуваарь өөрчлөх",
    desc: "Хичээлийн хуваарь засах, шинэчлэх",
    href: "/admin/timeTable",
  },
  {
    icon: <Plus size={20} className="text-white" />,
    gradient: "from-emerald-600 to-teal-500",
    glow: "bg-emerald-500",
    title: "Даалгавар нэмэх",
    desc: "Шинэ даалгавар үүсгэх",
    href: "/admin/homework/add",
  },
  {
    icon: <Edit3 size={20} className="text-white" />,
    gradient: "from-violet-600 to-purple-500",
    glow: "bg-violet-500",
    title: "Даалгавар удирдах",
    desc: "Даалгавар өөрчлөх, засах, устгах",
    href: "/admin/homework",
  },
  {
    icon: <Bus size={20} className="text-white" />,
    gradient: "from-pink-600 to-rose-500",
    glow: "bg-pink-500",
    title: "Автобусны суудал",
    desc: "Суудлын зохион байгуулалт",
    href: "/admin/bus",
  },
  {
    icon: <ScanLine size={20} className="text-white" />,
    gradient: "from-fuchsia-600 to-pink-500",
    glow: "bg-fuchsia-500",
    title: "QR баталгаажуулах",
    desc: "Автобусанд суух үед QR унших",
    href: "/admin/bus/verify",
  },
  {
    icon: <Users size={20} className="text-white" />,
    gradient: "from-teal-600 to-emerald-500",
    glow: "bg-teal-500",
    title: "Хэрэглэгчийн эрх",
    desc: "Хэнийг админ болгох, эрх хасах",
    href: "/admin/users",
  },
];

const STAT_CARDS = (s: Stats["cards"]) => [
  {
    label: "ХЭРЭГЛЭГЧ",
    value: s.users,
    color: "text-violet-500",
    icon: <Users size={34} className="text-violet-500/15" />,
    sub: `${s.admins} админ`,
  },
  {
    label: "ДААЛГАВАР",
    value: s.hworks,
    color: "text-indigo-500",
    icon: <BookOpen size={34} className="text-indigo-500/15" />,
    sub: undefined,
  },
  {
    label: "ХУВААРЬ",
    value: s.timetable,
    color: "text-cyan-500",
    icon: <Clock size={34} className="text-cyan-500/15" />,
    sub: undefined,
  },
  {
    label: "МЭДЭЭ",
    value: s.posts,
    color: "text-emerald-500",
    icon: <Newspaper size={34} className="text-emerald-500/15" />,
    sub: `${s.chats} чат`,
  },
  {
    label: "МЭДЭГДЭЛ",
    value: s.notificationsToday,
    color: "text-amber-500",
    icon: <Bell size={34} className="text-amber-500/15" />,
    sub: "сүүлийн 24цаг",
  },
  {
    label: "ХҮЛЭЭГДЭЖ",
    value: s.pendingBus,
    color: "text-rose-500",
    icon: <Bus size={34} className="text-rose-500/15" />,
    sub: "автобус",
  },
];

export default function AdminHomePage() {
  const router = useRouter();
  const [showLogout, setShowLogout] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busEnabled, setBusEnabled] = useState<boolean | null>(null);
  const [savingBus, setSavingBus] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) throw new Error();
        setStats(await res.json());
      } catch {
        toast.error("Статистик ачаалахад алдаа гарлаа");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBusEnabled(!!d?.busBookingEnabled))
      .catch(() => setBusEnabled(false));
  }, []);

  async function toggleBusBooking(next: boolean) {
    const prev = busEnabled;
    setBusEnabled(next);
    setSavingBus(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ busBookingEnabled: next }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        next
          ? "Автобусны захиалга нүүр хуудсанд гарлаа"
          : "Автобусны захиалга нуугдлаа",
      );
    } catch {
      setBusEnabled(prev);
      toast.error("Тохиргоо хадгалахад алдаа гарлаа");
    } finally {
      setSavingBus(false);
    }
  }

  const cards = stats ? STAT_CARDS(stats.cards) : [];

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      {/* Header — нэгдсэн header (буцах + мэдэгдэл + гарах + theme + профайл) */}
      <AppHeader
        onBack={() => router.push("/")}
        title="Dashboard"
        subtitle="11A ангийн удирдлага"
        icon={
          <span className="px-2 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-500 text-[10px] font-black tracking-widest shrink-0">
            ADMIN
          </span>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border-subtle bg-surface-elevated p-4 space-y-2"
                >
                  <Skeleton className="h-2.5 w-16 rounded-md" />
                  <Skeleton className="h-8 w-12 rounded-lg" />
                </div>
              ))
            : cards.map((c) => (
                <div
                  key={c.label}
                  className="relative overflow-hidden rounded-2xl border border-border-subtle bg-surface-elevated
                    p-4 hover:border-border hover:scale-[1.02] transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <p className="text-[10px] font-black tracking-widest text-on-surface-muted">
                      {c.label}
                    </p>
                    <span className="-mt-1 -mr-1">{c.icon}</span>
                  </div>
                  <p className={`text-4xl font-black mt-1 tabular-nums ${c.color}`}>
                    {c.value}
                  </p>
                  {c.sub && (
                    <p className="text-[10px] text-on-surface-muted/60 mt-0.5">
                      {c.sub}
                    </p>
                  )}
                </div>
              ))}
        </div>

        {/* ── Queue панелууд ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Автобусны хүсэлт */}
          <Panel
            icon={<Bus size={15} className="text-pink-400" />}
            title="Автобусны хүсэлт"
            count={stats?.cards.pendingBus ?? 0}
            accent="text-pink-400"
          >
            {!stats || stats.pendingBookings.length === 0 ? (
              <EmptyState text="Шинэ хүсэлт байхгүй" />
            ) : (
              <ul className="space-y-2">
                {stats.pendingBookings.map((b) => (
                  <li
                    key={b.seatId}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-bold text-on-surface">
                      {b.seatId} · {b.userName}
                    </span>
                    <span className="text-on-surface-muted shrink-0">
                      {timeAgo(b.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <PanelLink text="Удирдах" href="/admin/bus" />
          </Panel>

          {/* Сүүлийн чат */}
          <Panel
            icon={<MessageCircle size={15} className="text-cyan-400" />}
            title="Сүүлийн чат"
            count={stats?.cards.chats ?? 0}
            accent="text-cyan-400"
          >
            {!stats || stats.recentChats.length === 0 ? (
              <EmptyState text="Мессеж байхгүй" />
            ) : (
              <ul className="space-y-2">
                {stats.recentChats.slice(0, 4).map((m) => (
                  <li key={m.id} className="text-xs">
                    <span className="font-bold text-on-surface">{m.userName}</span>
                    <span className="text-on-surface-muted"> — {m.text}</span>
                  </li>
                ))}
              </ul>
            )}
            <PanelLink text="Чат руу" href="/chat" />
          </Panel>

          {/* Шинэ бүртгэл */}
          <Panel
            icon={<UserPlus size={15} className="text-emerald-400" />}
            title="Шинэ бүртгэл"
            count={
              stats
                ? stats.recentUsers.filter(
                    (u) =>
                      Date.now() - new Date(u.createdAt).getTime() <
                      7 * 86_400_000,
                  ).length
                : 0
            }
            accent="text-emerald-400"
          >
            {!stats || stats.recentUsers.length === 0 ? (
              <EmptyState text="Шинэ хүн бүртгүүлээгүй" />
            ) : (
              <ul className="space-y-2">
                {stats.recentUsers.slice(0, 4).map((u) => (
                  <li
                    key={u.name}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-bold text-on-surface truncate">
                      {u.fullName || u.name}
                    </span>
                    <span className="text-on-surface-muted shrink-0">
                      {timeAgo(u.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <PanelLink text="Бүгд" href="/admin/users" />
          </Panel>
        </div>

        {/* ── Жагсаалтууд: Шинээр бүртгүүлсэн + Сүүлийн даалгавар ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Шинээр бүртгүүлсэн */}
          <section>
            <SectionHeader
              title="Шинээр бүртгүүлсэн"
              href="/admin/users"
              onOpen={() => router.push("/admin/users")}
            />
            <div className="rounded-2xl border border-border-subtle bg-surface-elevated overflow-hidden">
              {loading ? (
                <div className="divide-y divide-border-subtle">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-4">
                      <Skeleton className="w-9 h-9 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-28 rounded-md" />
                        <Skeleton className="h-2.5 w-20 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !stats || stats.recentUsers.length === 0 ? (
                <EmptyState text="Хэрэглэгч байхгүй" pad="py-10" />
              ) : (
                <div className="divide-y divide-border-subtle">
                  {stats.recentUsers.map((u) => (
                    <button
                      key={u.name}
                      onClick={() => router.push("/admin/users")}
                      className="w-full flex items-center gap-3 p-3.5 text-left
                        hover:bg-card-hover transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-surface-alt border border-border shrink-0 flex items-center justify-center">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-black text-on-surface-muted">
                            {(u.fullName || u.name)[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">
                          {u.fullName || u.name}
                        </p>
                        <p className="text-[10px] text-on-surface-muted truncate">
                          @{u.name} · {timeAgo(u.createdAt)}
                        </p>
                      </div>
                      {u.role === "ADMIN" && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-500 text-[9px] font-black uppercase shrink-0">
                          Админ
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Сүүлийн даалгавар */}
          <section>
            <SectionHeader
              title="Сүүлийн даалгавар"
              href="/admin/homework"
              onOpen={() => router.push("/admin/homework")}
            />
            <div className="rounded-2xl border border-border-subtle bg-surface-elevated overflow-hidden">
              {loading ? (
                <div className="divide-y divide-border-subtle">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-4">
                      <Skeleton className="w-9 h-9 rounded-xl" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-40 rounded-md" />
                        <Skeleton className="h-2.5 w-24 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !stats || stats.recentHworks.length === 0 ? (
                <EmptyState text="Даалгавар байхгүй" pad="py-10" />
              ) : (
                <div className="divide-y divide-border-subtle">
                  {stats.recentHworks.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => router.push("/admin/homework")}
                      className="w-full flex items-center gap-3 p-3.5 text-left
                        hover:bg-card-hover transition-colors"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center shrink-0">
                        <BookOpen size={15} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{h.title}</p>
                        <p className="text-[10px] text-on-surface-muted truncate">
                          {h.subject} ·{" "}
                          {new Date(h.date).toLocaleDateString("mn-MN")}
                        </p>
                      </div>
                      <ArrowRight
                        size={14}
                        className="text-on-surface-muted/40 shrink-0"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── Тохиргоо ── */}
        <section>
          <SectionHeader title="Тохиргоо" />
          <div className="rounded-2xl border border-border-subtle bg-surface-elevated p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  busEnabled
                    ? "bg-gradient-to-br from-pink-600 to-rose-500"
                    : "bg-surface-alt border border-border"
                }`}
              >
                <Bus
                  size={18}
                  className={busEnabled ? "text-white" : "text-on-surface-muted"}
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold">Автобусны захиалга</p>
                <p className="text-[11px] text-on-surface-muted">
                  Нүүр хуудас дээр харагдах эсэх
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={busEnabled === true}
              disabled={busEnabled === null || savingBus}
              onClick={() => toggleBusBooking(!(busEnabled === true))}
              className={`relative w-12 h-7 rounded-full shrink-0 transition-colors duration-300
                ${
                  busEnabled
                    ? "bg-pink-600"
                    : "bg-surface-alt border border-border"
                }
                ${busEnabled === null || savingBus ? "opacity-50 cursor-wait" : ""}`}
            >
              <span
                className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow
                  transition-all duration-300 ${
                  busEnabled ? "left-[calc(100%-1.375rem)]" : "left-1"
                }`}
              />
            </button>
          </div>
        </section>

        {/* ── Хурдан үйлдлүүд (mobile дээр sidebar-г орлоно) ── */}
        <section className="lg:hidden">
          <SectionHeader title="Хурдан үйлдэл" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {NAV_CARDS.map((card) => (
              <button
                key={card.href}
                type="button"
                onClick={() => router.push(card.href)}
                className="group relative overflow-hidden rounded-2xl border border-border-subtle bg-surface-elevated backdrop-blur-xl
                  px-4 py-3.5 text-left
                  hover:border-border hover:scale-[1.02] hover:shadow-xl
                  active:scale-[0.98] transition-all duration-300 ease-out"
              >
                <div
                  className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-gradient-to-b ${card.gradient} opacity-50 group-hover:opacity-100 group-hover:w-1 transition-all duration-300`}
                />
                <div className="relative flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shrink-0 shadow-lg
                      group-hover:scale-110 transition-all duration-300`}
                  >
                    {card.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-on-surface text-sm">
                      {card.title}
                    </p>
                    <p className="text-[11px] text-on-surface-muted truncate">
                      {card.desc}
                    </p>
                  </div>
                  <ArrowRight
                    size={14}
                    className="text-on-surface-muted/40 group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0"
                  />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Status + Logout */}
        <div className="pb-4 space-y-3">
          <div className="flex items-center justify-center gap-2 py-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-on-surface-muted">
              Систем хэвийн ажиллаж байна
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowLogout(true)}
            className="group w-full flex items-center justify-center gap-2
              px-5 py-3.5 rounded-2xl backdrop-blur-xl
              bg-surface-elevated border border-border-subtle text-on-surface-muted
              hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400
              hover:scale-[1.01] active:scale-[0.99]
              transition-all duration-300 text-sm font-semibold"
          >
            <LogOut
              size={14}
              className="group-hover:rotate-12 transition-transform duration-300"
            />
            Системээс гарах
          </button>
        </div>
      </div>

      <LogoutConfirm open={showLogout} onClose={() => setShowLogout(false)} />
    </div>
  );
}

/* ── Дэд туслах компонентууд ── */

function Panel({
  icon,
  title,
  count,
  accent,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-elevated overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          {icon}
          <span className={`text-sm font-bold ${accent}`}>{title}</span>
        </div>
        <span className="min-w-[24px] h-6 px-1.5 rounded-full bg-surface-alt border border-border text-[10px] font-black flex items-center justify-center text-on-surface-muted">
          {count}
        </span>
      </div>
      <div className="p-4 flex-1">{children}</div>
    </div>
  );
}

function EmptyState({ text, pad = "py-6" }: { text: string; pad?: string }) {
  return (
    <div className={`text-center ${pad}`}>
      <div className="text-2xl mb-1.5">✨</div>
      <p className="text-xs text-on-surface-muted">{text}</p>
    </div>
  );
}

function PanelLink({ text, href }: { text: string; href: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className={`mt-3 w-full py-2 rounded-xl bg-surface-alt border border-border
        text-[11px] font-bold text-on-surface-muted
        hover:text-on-surface hover:border-border transition-all`}
    >
      {text} →
    </button>
  );
}

function SectionHeader({
  title,
  href,
  onOpen,
}: {
  title: string;
  href?: string;
  onOpen?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-black uppercase tracking-wider">
        {title}
      </h2>
      {href && (
        <button
          onClick={onOpen}
          className="text-[11px] font-bold text-accent hover:underline"
        >
          бүгд →
        </button>
      )}
    </div>
  );
}
