"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Shield,
  ShieldCheck,
  User as UserIcon,
  Loader2,
  Phone,
  Mail,
  Check,
  X,
  UserPlus,
  Cake,
} from "lucide-react";
import Skeleton from "@/app/_components/Skeleton";

type AdminUser = {
  name: string;
  role: string;
  fullName: string | null;
  avatar: string | null;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  status: string;
  createdAt: string;
  _count: { todos: number; busBookings: number };
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error();
      setUsers(await res.json());
    } catch {
      toast.error("Хэрэглэгчдийг ачаалахад алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMe((localStorage.getItem("name") ?? "").toLowerCase());
    load();
  }, [load]);

  const toggleRole = async (u: AdminUser) => {
    if (toggling) return;
    const nextRole = u.role === "ADMIN" ? "USER" : "ADMIN";
    // Optimistic
    setUsers((prev) =>
      prev.map((x) => (x.name === u.name ? { ...x, role: nextRole } : x)),
    );
    setToggling(u.name);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: u.name, role: nextRole }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        nextRole === "ADMIN"
          ? `${u.name} одоо АДМИН эрхтэй боллоо 👑`
          : `${u.name} энгийн хэрэглэгч боллоо`,
      );
    } catch {
      // Revert
      setUsers((prev) =>
        prev.map((x) =>
          x.name === u.name ? { ...x, role: u.role } : x,
        ),
      );
      toast.error("Эрхийг өөрчлөхөд алдаа гарлаа");
    } finally {
      setToggling(null);
    }
  };

  const decide = async (u: AdminUser, action: "approve" | "decline") => {
    if (deciding) return;
    if (
      action === "decline" &&
      !window.confirm(`${u.fullName || u.name}-ийн хүсэлтийг татгалзах уу? Бүртгэл нь устна.`)
    ) {
      return;
    }
    setDeciding(u.name);
    try {
      const res = await fetch("/api/admin/users/approval", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: u.name, action }),
      });
      if (!res.ok) throw new Error();
      if (action === "approve") {
        setUsers((prev) =>
          prev.map((x) => (x.name === u.name ? { ...x, status: "APPROVED" } : x)),
        );
        toast.success(`${u.fullName || u.name} зөвшөөрөгдлөө ✅`);
      } else {
        setUsers((prev) => prev.filter((x) => x.name !== u.name));
        toast.success(`${u.fullName || u.name}-ийн хүсэлт татгалзагдлаа`);
      }
    } catch {
      toast.error("Алдаа гарлаа");
    } finally {
      setDeciding(null);
    }
  };

  const pending = users.filter((u) => u.status === "PENDING");
  const approved = users.filter((u) => u.status !== "PENDING");
  const adminCount = approved.filter((u) => u.role === "ADMIN").length;

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push("/admin")}
          className="p-2 hover:bg-card-hover rounded-xl transition-all"
          aria-label="Буцах"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shrink-0">
          <ShieldCheck size={15} className="text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-sm">Хэрэглэгчийн эрх</h1>
          <p className="text-[10px] text-on-surface-muted">
            {loading
              ? "Ачааллаж байна..."
              : `${approved.length} хэрэглэгч • ${adminCount} админ${pending.length ? ` • ${pending.length} хүсэлт` : ""}`}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        {loading ? (
          <div className="space-y-3 stagger-in">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 rounded-2xl border bg-surface-elevated border-border-subtle"
              >
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-24 rounded-md" />
                  <Skeleton className="h-2.5 w-32 rounded-md" />
                </div>
                <Skeleton className="h-8 w-20 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <>
          {pending.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <UserPlus size={12} /> Бүртгэлийн хүсэлт ({pending.length})
              </p>
              <div className="space-y-2">
                {pending.map((u) => {
                  const busy = deciding === u.name;
                  return (
                    <div key={u.name}
                      className="p-4 rounded-2xl border bg-amber-500/5 border-amber-500/30 space-y-3">
                      <div>
                        <p className="font-bold text-sm">{u.fullName || u.name}</p>
                        <p className="text-[10px] text-on-surface-muted">
                          @{u.name} • {new Date(u.createdAt).toLocaleString("mn-MN")}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="flex items-center gap-1.5 truncate">
                          <Mail size={12} className="shrink-0 text-on-surface-muted" />
                          {u.email || <span className="text-on-surface-muted/60">Имэйл байхгүй</span>}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Phone size={12} className="shrink-0 text-on-surface-muted" />
                          {u.phone || <span className="text-on-surface-muted/60">Утас оруулаагүй</span>}
                        </span>
                        {u.birthDate && (
                          <span className="flex items-center gap-1.5">
                            <Cake size={12} className="shrink-0 text-on-surface-muted" />
                            {new Date(u.birthDate).toLocaleDateString("mn-MN")}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => decide(u, "approve")} disabled={busy}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border
                            bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 active:scale-95 disabled:opacity-50 transition-all">
                          {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />} Зөвшөөрөх
                        </button>
                        <button onClick={() => decide(u, "decline")} disabled={busy}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border
                            bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 active:scale-95 disabled:opacity-50 transition-all">
                          <X size={13} /> Татгалзах
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {approved.length === 0 ? (
          <div className="text-center py-20 bg-surface-elevated border border-border rounded-3xl">
            <div className="text-5xl mb-4 opacity-30">👥</div>
            <p className="text-gray-500">Хэрэглэгч олдсонгүй</p>
          </div>
        ) : (
          <div className="space-y-2">
            {approved.map((u) => {
              const isAdmin = u.role === "ADMIN";
              const isMe = u.name.toLowerCase() === me;
              const busy = toggling === u.name;
              return (
                <div
                  key={u.name}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all
                    ${isAdmin
                      ? "bg-amber-500/5 border-amber-500/20"
                      : "bg-surface-elevated border-border-subtle"
                    }`}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-alt border border-border shrink-0 flex items-center justify-center">
                    {u.avatar ? (
                      <img
                        src={u.avatar}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-black text-on-surface-muted text-sm">
                        {u.name[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm truncate">
                        {u.fullName || u.name}
                      </p>
                      {isMe && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-bold uppercase">
                          Та
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-on-surface-muted truncate">
                      @{u.name}
                    </p>
                    <div className="mt-1 flex flex-col gap-0.5 text-[11px]">
                      {u.phone ? (
                        <a
                          href={`tel:${u.phone}`}
                          className="flex items-center gap-1 text-on-surface hover:text-accent truncate"
                        >
                          <Phone size={11} className="shrink-0" />
                          <span className="truncate">{u.phone}</span>
                        </a>
                      ) : (
                        <span className="flex items-center gap-1 text-on-surface-muted/60">
                          <Phone size={11} className="shrink-0" />
                          Утас оруулаагүй
                        </span>
                      )}
                      {u.email ? (
                        <a
                          href={`mailto:${u.email}`}
                          className="flex items-center gap-1 text-on-surface hover:text-accent truncate"
                        >
                          <Mail size={11} className="shrink-0" />
                          <span className="truncate">{u.email}</span>
                        </a>
                      ) : (
                        <span className="flex items-center gap-1 text-on-surface-muted/60">
                          <Mail size={11} className="shrink-0" />
                          Имэйл оруулаагүй
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Role badge + toggle */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider
                        ${isAdmin
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          : "bg-surface-alt text-on-surface-muted border border-border"
                        }`}
                    >
                      {isAdmin ? <Shield size={10} /> : <UserIcon size={10} />}
                      {isAdmin ? "Админ" : "Хэрэглэгч"}
                    </span>
                    <button
                      onClick={() => toggleRole(u)}
                      disabled={busy || isMe}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95
                        ${isAdmin
                          ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                        }
                        ${busy ? "opacity-60" : ""}
                        disabled:opacity-40 disabled:cursor-not-allowed`}
                      title={isMe ? "Өөрийн эрхийг хасах боломжгүй" : undefined}
                    >
                      {busy ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : isAdmin ? (
                        "Эрх хасах"
                      ) : (
                        "Админ болгох"
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )}
          </>
        )}

        {/* Info */}
        <div className="mt-6 bg-surface-elevated border border-border-subtle rounded-2xl p-4">
          <p className="text-[10px] font-black text-on-surface-muted uppercase tracking-widest mb-2">
            Админ эрхийн боломж
          </p>
          <ul className="text-xs text-on-surface-muted space-y-1 list-disc list-inside">
            <li>Хичээлийн хуваарь, даалгавар нэмэх/засах/устгах</li>
            <li>Автобусны суудал удирдах, QR баталгаажуулах</li>
            <li>Мэдэгдэл илгээх, өгөгдөл устгах</li>
            <li>Чат мессеж бүрмөсөн устгах</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
