"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Loader2,
  Upload,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
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
function ymdToISO(y: string) {
  return new Date(`${y}T00:00:00.000Z`).toISOString();
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
function fileKey(f: File) {
  return `${f.name}__${f.size}__${f.lastModified}`;
}
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

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

function ImageModal({
  images,
  startIndex,
  onClose,
}: {
  images: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(startIndex);
  useEffect(() => setI(startIndex), [startIndex]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft")
        setI((p) => (p - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setI((p) => (p + 1) % images.length);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [images.length, onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-card-hover flex items-center justify-center hover:bg-white/20 transition-all"
      >
        <X size={16} />
      </button>
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setI((p) => (p - 1 + images.length) % images.length);
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-card-hover flex items-center justify-center hover:bg-white/20 transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setI((p) => (p + 1) % images.length);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-card-hover flex items-center justify-center hover:bg-white/20 transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}
      <img
        src={images[i]}
        alt=""
        className="max-h-[88vh] max-w-[94vw] rounded-2xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      {images.length > 1 && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-600">
          {i + 1}/{images.length}
        </p>
      )}
    </div>
  );
}

export default function AdminHomeworkDatePage() {
  const router = useRouter();
  const base = usePathname().startsWith("/manage") ? "/manage" : "/admin";
  const params = useParams();
  const dateKey = params?.date as string;

  const [data, setData] = useState<HworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<{
    images: string[];
    index: number;
  } | null>(null);
  const [editing, setEditing] = useState<HworkItem | null>(null);
  const [deleting, setDeleting] = useState<HworkItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [eSubject, setESubject] = useState("");
  const [eTitle, setETitle] = useState("");
  const [eDateYmd, setEDateYmd] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const dayHomeworks = useMemo(
    () => data.filter((x) => ymd(x.date) === dateKey),
    [data, dateKey],
  );

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hwork", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Ачааллахад алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    document.body.style.overflow =
      editing || deleting || viewer ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [editing, deleting, viewer]);

  useEffect(() => {
    if (!editing) return;
    setESubject(editing.subject || "");
    setETitle(editing.title || "");
    setEDateYmd(ymd(editing.date));
    setImageUrls(getImages(editing));
    setFiles([]);
    previewUrls.forEach((u) => URL.revokeObjectURL(u));
    setPreviewUrls([]);
  }, [editing?.id]);

  const applyFiles = (picked: File[]) => {
    for (const f of picked) {
      if (!ALLOWED.has(f.type)) {
        toast.error("Зөвхөн JPG/PNG/WEBP");
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error("5MB-аас бага байх ёстой");
        return;
      }
    }
    const existing = new Map(files.map((f) => [fileKey(f), f]));
    for (const f of picked) existing.set(fileKey(f), f);
    const next = Array.from(existing.values());
    setFiles(next);
    previewUrls.forEach((u) => URL.revokeObjectURL(u));
    setPreviewUrls(next.map((f) => URL.createObjectURL(f)));
    if (fileRef.current) fileRef.current.value = "";
  };

  const uploadPicked = async () => {
    if (!files.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error();
        const json = (await res.json()) as any;
        const url = json?.url ?? json?.blob?.url ?? null;
        if (!url) throw new Error("URL олдсонгүй");
        urls.push(url);
      }
      setImageUrls((prev) => Array.from(new Set([...prev, ...urls])));
      setFiles([]);
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
      setPreviewUrls([]);
      toast.success(`${urls.length} зураг нэмэгдлээ ✅`, { duration: 2000 });
    } catch {
      toast.error("Upload алдаа гарлаа");
    } finally {
      setUploading(false);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/hwork/${editing.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subject: eSubject.trim(),
          title: eTitle.trim(),
          date: ymdToISO(eDateYmd),
          images: imageUrls,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = (await res.json()) as HworkItem;
      setData((p) => p.map((x) => (x.id === updated.id ? updated : x)));
      setEditing(null);
      toast.success("Амжилттай хадгалагдлаа ✅", { duration: 2000 });
    } catch {
      toast.error("Хадгалахад алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/hwork/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setData((p) => p.filter((x) => x.id !== id));
      setDeleting(null);
      toast.info("Устгагдлаа 🗑️", { duration: 2000 });
    } catch {
      toast.error("Устгахад алдаа гарлаа");
    } finally {
      setBusyId(null);
    }
  };

  const canSave =
    eSubject.trim() &&
    eTitle.trim() &&
    eDateYmd.trim() &&
    !saving &&
    !uploading;

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
            onClick={() => router.push(`${base}/homework`)}
            className="p-2 hover:bg-card-hover rounded-full transition-all duration-200 hover:scale-110 active:scale-95 group"
          >
            <ArrowLeft
              size={22}
              className="group-hover:text-violet-400 transition-colors"
            />
          </button>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 mb-1">
              <span className="text-[10px] font-bold text-violet-400/80 uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 rounded-full">
                {getDayOfWeek(dateKey)}
              </span>
            </div>
            <h1 className="text-xl font-bold text-on-surface">
              {formatDateDisplay(dateKey)}
            </h1>
            <p className="text-gray-600 text-xs mt-0.5">
              {dayHomeworks.length} даалгавар
            </p>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-violet-500" size={28} />
            <p className="text-gray-600 text-sm">Ачаалж байна...</p>
          </div>
        ) : dayHomeworks.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.02] border border-border-subtle rounded-2xl">
            <div className="text-4xl mb-3 opacity-30">📝</div>
            <p className="text-gray-600 text-sm">Энэ өдөр даалгавар байхгүй</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayHomeworks.map((x, idx) => {
              const imgs = getImages(x);
              const c = sc(x.subject);
              return (
                <div
                  key={x.id}
                  className="group rounded-2xl border border-border-subtle bg-white/[0.03] hover:border-white/12 hover:bg-white/[0.05] transition-all duration-200 overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className={`w-8 h-8 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center font-bold text-on-surface text-xs flex-shrink-0 shadow-md`}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border mb-2 ${c.bg} ${c.text} ${c.border}`}
                        >
                          {x.subject}
                        </span>
                        <p className="text-sm text-on-surface whitespace-pre-line leading-relaxed group-hover:text-on-surface transition-colors">
                          {x.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 ">
                        <button
                          onClick={() => setEditing(x)}
                          className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 hover:bg-violet-500/20 hover:scale-110 active:scale-95 transition-all"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => setDeleting(x)}
                          className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 hover:scale-110 active:scale-95 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    {imgs.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {imgs.map((img, i) => (
                          <div
                            key={i}
                            className="relative group/img cursor-zoom-in"
                            onClick={() =>
                              setViewer({ images: imgs, index: i })
                            }
                          >
                            <img
                              src={img}
                              alt=""
                              className="h-24 w-full object-cover rounded-xl border border-border group-hover/img:border-white/20 transition-colors"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                              <div className="w-8 h-8 rounded-xl bg-black/50 backdrop-blur flex items-center justify-center">
                                <ZoomIn size={14} className="text-white" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-xl bg-[#0a0a0a] border border-border rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-border-subtle">
              <p className="font-bold text-on-surface">Даалгавар засах</p>
              <button
                onClick={() => setEditing(null)}
                className="w-8 h-8 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-gray-500 hover:bg-card-hover hover:text-on-surface transition-all"
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-1.5 block">
                    Хичээл
                  </label>
                  <input
                    value={eSubject}
                    onChange={(e) => setESubject(e.target.value)}
                    placeholder="Математик"
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-muted/50 outline-none focus:ring-1 focus:ring-white/20 hover:border-white/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-1.5 block">
                    Огноо
                  </label>
                  <input
                    type="date"
                    value={eDateYmd}
                    onChange={(e) => setEDateYmd(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-white/20 hover:border-white/20 transition-all [color-scheme:dark]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-1.5 block">
                  Даалгавар
                </label>
                <textarea
                  value={eTitle}
                  onChange={(e) => setETitle(e.target.value)}
                  rows={4}
                  placeholder="Дэлгэрэнгүй..."
                  className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-muted/50 outline-none focus:ring-1 focus:ring-white/20 hover:border-white/20 transition-all resize-none"
                />
              </div>
              {imageUrls.length > 0 && (
                <div>
                  <label className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-2 block">
                    Зургууд ({imageUrls.length})
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {imageUrls.map((u, i) => (
                      <div key={i} className="relative group/img">
                        <img
                          src={u}
                          alt=""
                          onClick={() =>
                            setViewer({ images: imageUrls, index: i })
                          }
                          className="h-20 w-full object-cover rounded-xl border border-border cursor-zoom-in hover:border-white/20 transition-colors"
                        />
                        <button
                          onClick={() =>
                            setImageUrls((p) => p.filter((_, idx) => idx !== i))
                          }
                          className="absolute top-1 right-1 w-5 h-5 rounded-lg bg-red-500/80 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                        >
                          <X size={9} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-2 block">
                  Шинэ зураг
                </label>
                <div className="border border-dashed border-border rounded-xl p-4 text-center hover:border-white/20 transition-colors">
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={(e) =>
                      applyFiles(Array.from(e.target.files || []))
                    }
                    className="hidden"
                    id="date-edit-upload"
                  />
                  <label
                    htmlFor="date-edit-upload"
                    className="cursor-pointer text-xs text-gray-500 hover:text-on-surface-muted transition-colors"
                  >
                    {files.length > 0
                      ? `${files.length} зураг сонгогдсон`
                      : "Зураг сонгох эсвэл чирж оруулах"}
                  </label>
                  {previewUrls.length > 0 && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {previewUrls.map((u, i) => (
                        <img
                          key={i}
                          src={u}
                          alt=""
                          className="h-14 w-full object-cover rounded-lg border border-border"
                        />
                      ))}
                    </div>
                  )}
                  {files.length > 0 && (
                    <button
                      onClick={uploadPicked}
                      disabled={uploading}
                      className="mt-2 px-4 py-1.5 rounded-xl bg-violet-600/20 border border-violet-500/20 text-violet-400 text-xs font-bold hover:bg-violet-600/30 active:scale-95 transition-all disabled:opacity-40 flex items-center gap-1.5 mx-auto"
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={11} className="animate-spin" />
                          Upload хийж байна...
                        </>
                      ) : (
                        <>
                          <Upload size={11} />
                          Upload хийх
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEditing(null)}
                  disabled={saving || uploading}
                  className="flex-1 py-2.5 rounded-xl bg-surface-elevated border border-border text-sm text-gray-400 hover:bg-card-hover hover:text-on-surface transition-all disabled:opacity-40"
                >
                  Болих
                </button>
                <button
                  onClick={saveEdit}
                  disabled={!canSave}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600/30 border border-violet-500/30 text-sm font-bold text-violet-300 hover:bg-violet-600/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Хадгалж байна...
                    </>
                  ) : (
                    "Хадгалах"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleting && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDeleting(null)}
        >
          <div
            className="w-full max-w-sm bg-[#0a0a0a] border border-border rounded-3xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
              <Trash2 size={18} className="text-red-400" />
            </div>
            <p className="font-bold text-on-surface mb-1">Устгах уу?</p>
            <p className="text-xs text-gray-600 mb-4">
              Энэ үйлдлийг буцаах боломжгүй
            </p>
            <div className="bg-surface-elevated border border-border-subtle rounded-xl px-4 py-3 mb-4">
              <p className="text-[10px] text-gray-600 mb-1">
                {deleting.subject}
              </p>
              <p className="text-sm text-on-surface-muted line-clamp-2">
                {deleting.title}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleting(null)}
                disabled={!!busyId}
                className="flex-1 py-2.5 rounded-xl bg-surface-elevated border border-border text-sm text-gray-400 hover:bg-card-hover transition-all disabled:opacity-40"
              >
                Болих
              </button>
              <button
                onClick={() => doDelete(deleting.id)}
                disabled={!!busyId}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-sm font-bold text-red-400 hover:bg-red-500/30 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {busyId ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Устгаж байна...
                  </>
                ) : (
                  "Устгах"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewer && (
        <ImageModal
          images={viewer.images}
          startIndex={viewer.index}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}
