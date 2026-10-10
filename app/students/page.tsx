"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronRight, Crown, Star, Shield, GraduationCap } from "lucide-react";
import Skeleton from "@/app/_components/Skeleton";
import AppHeader from "@/app/_components/AppHeader";
import { BRANCHES, branchName } from "@/lib/branches";

type Student = {
  name: string;
  fullName: string | null;
  avatar: string | null;
  bio: string | null;
  role: string;
  branch: number | null;
  branchLeader: boolean;
};

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState<number | "all">("all");

  useEffect(() => {
    fetch("/api/students")
      .then((r) => (r.ok ? r.json() : []))
      .then(setStudents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return students.filter(
      (s) =>
        (branch === "all" || s.branch === branch) &&
        (!ql ||
          s.name.toLowerCase().includes(ql) ||
          (s.fullName ?? "").toLowerCase().includes(ql)),
    );
  }, [students, q, branch]);

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      <AppHeader title="Сурагчид" subtitle={loading ? undefined : `${students.length} сурагч`} />

      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
        {/* Хайлт */}
        <div className="flex items-center gap-2 bg-surface-elevated border border-border rounded-2xl px-4 py-3">
          <Search size={16} className="text-on-surface-muted shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Нэрээр хайх..."
            className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder:text-on-surface-muted/50"
          />
        </div>

        {/* Салаагаар шүүх */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[{ id: "all" as const, name: "Бүгд" }, ...BRANCHES].map((b) => {
            const active = branch === b.id;
            const count =
              b.id === "all" ? students.length : students.filter((s) => s.branch === b.id).length;
            return (
              <button
                key={b.id}
                onClick={() => setBranch(b.id)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all
                  ${active
                    ? "bg-accent/20 border-accent/30 text-accent"
                    : "bg-surface-elevated border-border text-on-surface-muted hover:bg-card-hover"}`}
              >
                {b.name} <span className="opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Жагсаалт */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl border border-border-subtle bg-surface-elevated">
                <Skeleton className="w-11 h-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-32 rounded-md" />
                  <Skeleton className="h-2.5 w-20 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-on-surface-muted text-sm">Сурагч олдсонгүй</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s, i) => (
              <button
                key={s.name}
                onClick={() => router.push(`/user/${encodeURIComponent(s.name)}`)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border-subtle bg-surface-elevated
                  text-left hover:bg-card-hover hover:border-accent/30 active:scale-[0.98] transition-all"
              >
                <span className="w-5 text-[10px] font-bold text-on-surface-muted/50 text-right shrink-0">{i + 1}</span>
                <div className="w-11 h-11 rounded-full overflow-hidden bg-accent/15 flex items-center justify-center text-accent font-black shrink-0">
                  {s.avatar ? (
                    <img src={s.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (s.fullName || s.name)[0]?.toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate flex items-center gap-1.5">
                    {s.fullName || s.name}
                    {s.role === "ADMIN" && <Shield size={12} className="text-amber-400 shrink-0" />}
                    {s.role === "LEADER" && <Crown size={12} className="text-violet-400 shrink-0" />}
                    {s.role === "TEACHER" && <GraduationCap size={12} className="text-emerald-400 shrink-0" />}
                    {s.branchLeader && <Star size={11} className="text-sky-400 fill-sky-400 shrink-0" />}
                  </p>
                  <p className="text-[10px] text-on-surface-muted truncate">
                    @{s.name}
                    {s.branch ? ` • ${branchName(s.branch)}` : ""}
                    {s.bio ? ` • ${s.bio}` : ""}
                  </p>
                </div>
                <ChevronRight size={16} className="text-on-surface-muted/40 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {!loading && (
          <p className="text-[10px] text-on-surface-muted/60 text-center pt-2">
            <Shield size={10} className="inline text-amber-400" /> Админ •{" "}
            <Crown size={10} className="inline text-violet-400" /> Ангийн дарга •{" "}
            <GraduationCap size={10} className="inline text-emerald-400" /> Ангийн багш •{" "}
            <Star size={10} className="inline text-sky-400 fill-sky-400" /> Салааны дарга
          </p>
        )}
      </div>
    </div>
  );
}
