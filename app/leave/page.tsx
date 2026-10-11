"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Loader2, Send, X, CalendarDays, FileText } from "lucide-react";
import { toast } from "sonner";
import AppHeader from "@/app/_components/AppHeader";
import Skeleton from "@/app/_components/Skeleton";
import { useMyRoles } from "@/app/_components/useMyRoles";
import { LEAVE_PUBLIC, LEAVE_TYPES, canUseLeave, type LeaveType } from "@/lib/leave";

type LeaveRequest = {
  id: string;
  userName: string;
  type: LeaveType;
  fromDate: string;
  toDate: string;
  reason: string;
  image: string | null;
  status: "PENDING" | "APPROVED" | "DECLINED";
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
  fullName?: string | null;
  avatar?: string | null;
  branch?: number | null;
};

const STATUS: Record<LeaveRequest["status"], { label: string; cls: string }> = {
  PENDING: { label: "Хүлээгдэж буй", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  APPROVED: { label: "Зөвшөөрсөн", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  DECLINED: { label: "Татгалзсан", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
};

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function rangeLabel(r: { fromDate: string; toDate: string }) {
  return r.fromDate === r.toDate ? r.fromDate : `${r.fromDate} – ${r.toDate}`;
}

export default function LeavePage() {
  const router = useRouter();
  const { roles } = useMyRoles();
  const [loading, setLoading] = useState(true);
  const [canDecide, setCanDecide] = useState(false);
  const [mine, setMine] = useState<LeaveRequest[]>([]);
  const [all, setAll] = useState<LeaveRequest[]>([]);
  const [view, setView] = useState<"request" | "review">("request");
  const [reviewTab, setReviewTab] = useState<"PENDING" | "DONE">("PENDING");

  // Хүсэлтийн маягт
  const [type, setType] = useState<LeaveType | null>(null);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Одоохондоо зөвхөн админд нээлттэй
  useEffect(() => {
    if (roles && !canUseLeave(roles.role)) router.replace("/");
  }, [roles, router]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/leave");
      if (res.ok) {
        const data = await res.json();
        setCanDecide(data.canDecide);
        setMine(data.mine);
        setAll(data.all);
      }
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const pickFile = (f: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!f) return;
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(f.type) || f.size >= 5 * 1024 * 1024) {
      toast.error("Зөвхөн JPG/PNG/WEBP, 5MB хүртэл");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const resetForm = () => {
    setType(null);
    setReason("");
    setFromDate(today());
    setToDate(today());
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
  };

  const submit = async () => {
    if (!type || sending) return;
    if (type === "SICK" && !file) return toast.error("Эмнэлгийн бичгийн зургаа оруулна уу");
    if (type === "PERSONAL" && !reason.trim()) return toast.error("Шалтгаанаа бичнэ үү");
    if (toDate < fromDate) return toast.error("Дуусах огноо эхлэхээс өмнө байна");
    setSending(true);
    try {
      let image: string | null = null;
      if (type === "SICK" && file) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const j = up.ok ? await up.json() : null;
        if (!j?.url) throw new Error("Зураг хуулахад алдаа гарлаа");
        image = j.url;
      }
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, fromDate, toDate, reason: reason.trim(), image }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      toast.success("Хүсэлт илгээгдлээ. Ангийн багш шийднэ.");
      resetForm();
      await load();
    } catch (e) {
      toast.error((e as Error).message || "Алдаа гарлаа");
    }
    setSending(false);
  };

  const cancel = async (r: LeaveRequest) => {
    if (!confirm("Энэ хүсэлтийг цуцлах уу?")) return;
    const res = await fetch(`/api/leave/${r.id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) await load();
    else toast.error("Цуцлахад алдаа гарлаа");
  };

  const decide = async (r: LeaveRequest, action: "approve" | "decline") => {
    if (deciding) return;
    setDeciding(r.id);
    try {
      const res = await fetch(`/api/leave/${r.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      toast.success(action === "approve" ? "Зөвшөөрлөө" : "Татгалзлаа");
      await load();
    } catch (e) {
      toast.error((e as Error).message || "Алдаа гарлаа");
    }
    setDeciding(null);
  };

  const pending = all.filter((r) => r.status === "PENDING");
  const done = all.filter((r) => r.status !== "PENDING");
  const reviewList = reviewTab === "PENDING" ? pending : done;
  const typeInfo = (t: LeaveType) => LEAVE_TYPES.find((x) => x.id === t)!;

  const requestCard = (r: LeaveRequest, mode: "mine" | "review") => {
    const t = typeInfo(r.type);
    const st = STATUS[r.status];
    return (
      <div key={r.id} className="rounded-3xl border border-border-subtle bg-surface-elevated p-4 space-y-3">
        <div className="flex items-start gap-3">
          {mode === "review" && (
            <div className="w-10 h-10 rounded-full overflow-hidden bg-accent/15 flex items-center justify-center text-accent font-black shrink-0">
              {r.avatar ? <img src={r.avatar} alt="" className="w-full h-full object-cover" /> : (r.fullName || r.userName)[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {mode === "review" && (
              <p className="font-black text-sm truncate">
                {r.fullName || r.userName}
                <span className="text-[10px] text-on-surface-muted font-bold"> @{r.userName}{r.branch ? ` • ${r.branch}-р салаа` : ""}</span>
              </p>
            )}
            <p className="text-sm font-bold">{t.emoji} {t.name}</p>
            <p className="text-xs text-on-surface-muted flex items-center gap-1 mt-0.5">
              <CalendarDays size={12} /> {rangeLabel(r)}
            </p>
          </div>
          <span className={`shrink-0 px-2 py-1 rounded-xl text-[10px] font-black border ${st.cls}`}>{st.label}</span>
        </div>

        {r.reason && (
          <p className="text-sm whitespace-pre-wrap break-words bg-surface rounded-2xl px-3 py-2.5 border border-border-subtle">
            {r.reason}
          </p>
        )}
        {r.image && (
          <a href={r.image} target="_blank" rel="noopener noreferrer" className="block">
            <img src={r.image} alt="Эмнэлгийн бичиг" loading="lazy"
              className="w-full max-h-72 object-contain rounded-2xl border border-border bg-surface" />
          </a>
        )}

        {r.decidedBy && (
          <p className="text-[10px] text-on-surface-muted">Шийдсэн: {r.decidedBy}</p>
        )}

        {mode === "review" && r.status === "PENDING" && (
          <div className="flex gap-2">
            <button onClick={() => decide(r, "approve")} disabled={deciding === r.id}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30
                text-emerald-400 text-sm font-black active:scale-95 disabled:opacity-50">
              {deciding === r.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Зөвшөөрөх
            </button>
            <button onClick={() => decide(r, "decline")} disabled={deciding === r.id}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-red-500/15 border border-red-500/30
                text-red-400 text-sm font-black active:scale-95 disabled:opacity-50">
              <X size={14} /> Татгалзах
            </button>
          </div>
        )}
        {mode === "mine" && r.status === "PENDING" && (
          <button onClick={() => cancel(r)} className="text-xs font-bold text-on-surface-muted hover:text-red-400">
            Хүсэлт цуцлах
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      <AppHeader title="Чөлөө авах" subtitle={LEAVE_PUBLIC ? undefined : "Туршилт — зөвхөн админд харагдана"} />

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        {canDecide && (
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-surface-elevated border border-border">
            {([["request", "Хүсэлт гаргах"], ["review", `Хүсэлтүүд${pending.length ? ` (${pending.length})` : ""}`]] as const).map(([id, label]) => (
              <button key={id} onClick={() => setView(id)}
                className={`py-2 rounded-xl text-xs font-black transition-all ${view === id ? "bg-accent/20 text-accent" : "text-on-surface-muted"}`}>
                {label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-40 rounded-3xl" />
          </div>
        ) : view === "review" && canDecide ? (
          <>
            <div className="flex gap-1.5">
              {([["PENDING", `Хүлээгдэж буй (${pending.length})`], ["DONE", `Шийдсэн (${done.length})`]] as const).map(([id, label]) => (
                <button key={id} onClick={() => setReviewTab(id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all
                    ${reviewTab === id ? "bg-accent/20 border-accent/30 text-accent" : "bg-surface-elevated border-border text-on-surface-muted"}`}>
                  {label}
                </button>
              ))}
            </div>
            {reviewList.length === 0 ? (
              <div className="text-center py-14 text-on-surface-muted text-sm">Хүсэлт алга</div>
            ) : (
              <div className="space-y-3">{reviewList.map((r) => requestCard(r, "review"))}</div>
            )}
          </>
        ) : (
          <>
            {/* 2 төрөл */}
            <div className="grid grid-cols-2 gap-3">
              {LEAVE_TYPES.map((t) => {
                const active = type === t.id;
                return (
                  <button key={t.id} onClick={() => setType(active ? null : t.id)}
                    className={`rounded-3xl p-4 text-left border transition-all active:scale-95
                      ${active
                        ? "border-accent bg-accent/10 ring-2 ring-accent/30"
                        : "border-border bg-surface-elevated hover:bg-card-hover"}`}>
                    <span className="text-3xl">{t.emoji}</span>
                    <p className="font-black mt-2">{t.name}</p>
                    <p className="text-[10px] text-on-surface-muted leading-tight mt-0.5">{t.desc}</p>
                  </button>
                );
              })}
            </div>

            {type && (
              <div className="rounded-3xl border border-border bg-surface-elevated p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold text-on-surface-muted">Эхлэх өдөр</span>
                    <input type="date" value={fromDate}
                      onChange={(e) => { setFromDate(e.target.value); if (toDate < e.target.value) setToDate(e.target.value); }}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold text-on-surface-muted">Дуусах өдөр</span>
                    <input type="date" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/30" />
                  </label>
                </div>

                {type === "SICK" ? (
                  <div className="space-y-2">
                    <p className="text-xs font-bold flex items-center gap-1.5"><FileText size={13} /> Эмнэлгийн бичиг</p>
                    {preview ? (
                      <div className="relative">
                        <img src={preview} alt="" className="w-full max-h-64 object-contain rounded-2xl border border-border bg-surface" />
                        <button onClick={() => { if (preview) URL.revokeObjectURL(preview); setFile(null); setPreview(null); }}
                          aria-label="Зураг хасах"
                          className="absolute top-2 right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center">
                          <X size={13} className="text-white" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => fileRef.current?.click()}
                        className="w-full py-8 rounded-2xl border-2 border-dashed border-border text-on-surface-muted
                          flex flex-col items-center gap-2 hover:bg-card-hover hover:border-accent/40 transition-all">
                        <ImagePlus size={24} />
                        <span className="text-xs font-bold">Эмнэлгийн бичгийн зураг оруулах</span>
                      </button>
                    )}
                    <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden"
                      onChange={(e) => pickFile(e.target.files?.[0])} />
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} rows={2}
                      placeholder="Нэмэлт тайлбар (заавал биш)"
                      className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-sm outline-none resize-y focus:ring-2 focus:ring-accent/30" />
                  </div>
                ) : (
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} rows={4}
                    placeholder="Чөлөө авах шалтгаанаа бичнэ үү..."
                    className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-sm outline-none resize-y focus:ring-2 focus:ring-accent/30" />
                )}

                <button onClick={submit} disabled={sending}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent text-white text-sm font-black
                    hover:opacity-90 active:scale-[0.98] disabled:opacity-50">
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Хүсэлт илгээх
                </button>
              </div>
            )}

            {mine.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-black text-on-surface-muted uppercase tracking-wide pt-2">Миний хүсэлтүүд</p>
                {mine.map((r) => requestCard(r, "mine"))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
