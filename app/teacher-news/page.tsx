"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GraduationCap, ImagePlus, Loader2, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import AppHeader from "@/app/_components/AppHeader";
import Skeleton from "@/app/_components/Skeleton";
import { TEACHER_CATEGORIES, teacherCategory, type TeacherCategory } from "@/lib/teacherNews";

type TeacherPost = {
  id: string;
  category: TeacherCategory;
  title: string;
  text: string;
  images: string[];
  userName: string;
  authorName: string;
  authorAvatar: string | null;
  createdAt: string;
};

const MAX_IMAGES = 6;

const CATEGORY_STYLE: Record<TeacherCategory, string> = {
  EVENT: "from-sky-500 to-blue-600",
  ACTIVITY: "from-emerald-500 to-teal-600",
  PREPARE: "from-amber-500 to-orange-600",
};

function dateLabel(iso: string) {
  return new Date(iso).toLocaleString("mn-MN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TeacherNewsPage() {
  const [category, setCategory] = useState<TeacherCategory | "ALL">("ALL");
  const [posts, setPosts] = useState<TeacherPost[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [canPost, setCanPost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState("");
  const [isAdminUser, setIsAdminUser] = useState(false);

  // Шинэ мэдээ
  const [composeCat, setComposeCat] = useState<TeacherCategory>("EVENT");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (cat: TeacherCategory | "ALL") => {
    setLoading(true);
    try {
      const qs = cat === "ALL" ? "" : `?category=${cat}`;
      const res = await fetch(`/api/teacher-news${qs}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
        setCounts(data.counts);
        setCanPost(data.canPost);
      }
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Мэдэгдлээс ?category=... гэж орж ирж болно
    const t = setTimeout(() => {
      const fromUrl = new URLSearchParams(window.location.search).get("category");
      const initial = TEACHER_CATEGORIES.some((c) => c.id === fromUrl) ? (fromUrl as TeacherCategory) : "ALL";
      setCategory(initial);
      if (initial !== "ALL") setComposeCat(initial);
      setMe(localStorage.getItem("name") ?? "");
      load(initial);
    }, 0);
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIsAdminUser(d?.role === "ADMIN"))
      .catch(() => {});
    return () => clearTimeout(t);
  }, [load]);

  const selectCategory = (cat: TeacherCategory | "ALL") => {
    setCategory(cat);
    if (cat !== "ALL") setComposeCat(cat);
    const url = cat === "ALL" ? "/teacher-news" : `/teacher-news?category=${cat}`;
    window.history.replaceState(null, "", url);
    load(cat);
  };

  const addFiles = (picked: File[]) => {
    if (fileRef.current) fileRef.current.value = "";
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    const valid = picked.filter((f) => allowed.has(f.type) && f.size < 5 * 1024 * 1024);
    if (valid.length < picked.length) toast.error("Зөвхөн JPG/PNG/WEBP, 5MB хүртэл");
    const next = [...files, ...valid].slice(0, MAX_IMAGES);
    setFiles(next);
    previews.forEach((u) => URL.revokeObjectURL(u));
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const removeFile = (i: number) => {
    const next = files.filter((_, idx) => idx !== i);
    setFiles(next);
    previews.forEach((u) => URL.revokeObjectURL(u));
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const submit = async () => {
    if (!title.trim() || posting) {
      if (!title.trim()) toast.error("Гарчиг бичнэ үү");
      return;
    }
    setPosting(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const j = res.ok ? await res.json() : null;
        if (!j?.url) throw new Error("Зураг хуулахад алдаа гарлаа");
        urls.push(j.url);
      }
      const res = await fetch("/api/teacher-news", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category: composeCat, title: title.trim(), text: text.trim(), images: urls }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      setTitle("");
      setText("");
      previews.forEach((u) => URL.revokeObjectURL(u));
      setFiles([]);
      setPreviews([]);
      toast.success("Мэдээ нийтлэгдлээ!");
      await load(category);
    } catch (e) {
      toast.error((e as Error).message || "Алдаа гарлаа");
    }
    setPosting(false);
  };

  const remove = async (p: TeacherPost) => {
    if (!confirm("Энэ мэдээг устгах уу?")) return;
    const res = await fetch(`/api/teacher-news/${p.id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      setPosts((prev) => prev.filter((x) => x.id !== p.id));
      setCounts((prev) => ({ ...prev, [p.category]: Math.max(0, (prev[p.category] ?? 1) - 1) }));
    } else {
      toast.error("Устгахад алдаа гарлаа");
    }
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      <AppHeader title="Багшийн мэдээ" subtitle="Ангийн багшаас ирсэн мэдээлэл" />

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        {/* 3 ангилал */}
        <div className="grid grid-cols-3 gap-2">
          {TEACHER_CATEGORIES.map((c) => {
            const active = category === c.id;
            return (
              <button key={c.id} onClick={() => selectCategory(active ? "ALL" : c.id)}
                className={`relative rounded-3xl p-3 text-left text-white bg-gradient-to-br ${CATEGORY_STYLE[c.id]}
                  shadow-lg active:scale-95 transition-all
                  ${active ? "ring-2 ring-offset-2 ring-offset-surface ring-white/80" : category !== "ALL" ? "opacity-50" : ""}`}>
                <span className="text-2xl">{c.emoji}</span>
                <p className="text-[12px] font-black leading-tight mt-1.5">{c.name}</p>
                <p className="text-[9px] opacity-80 leading-tight mt-0.5">{c.desc}</p>
                {(counts[c.id] ?? 0) > 0 && (
                  <span className="absolute top-2 right-2 min-w-5 h-5 px-1.5 rounded-full bg-white/25 text-[10px] font-black flex items-center justify-center">
                    {counts[c.id]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {category !== "ALL" && (
          <button onClick={() => selectCategory("ALL")} className="text-xs font-bold text-accent">
            ← Бүгдийг харах ({total})
          </button>
        )}

        {/* Багш / админ — мэдээ оруулах */}
        {canPost && (
          <div className="rounded-3xl border border-border bg-surface-elevated p-4 space-y-3">
            <p className="text-xs font-black text-on-surface-muted uppercase tracking-wide flex items-center gap-1.5">
              <GraduationCap size={14} className="text-emerald-400" /> Шинэ мэдээ
            </p>
            <div className="flex gap-1.5 overflow-x-auto">
              {TEACHER_CATEGORIES.map((c) => (
                <button key={c.id} onClick={() => setComposeCat(c.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all
                    ${composeCat === c.id
                      ? "bg-accent/20 border-accent/40 text-accent"
                      : "bg-surface border-border text-on-surface-muted hover:bg-card-hover"}`}>
                  {c.emoji} {c.short}
                </button>
              ))}
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
              placeholder="Гарчиг (жишээ нь: Баасан гарагт спорт наадам)"
              className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/30" />
            <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={3000} rows={4}
              placeholder="Дэлгэрэнгүй мэдээлэл..."
              className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-sm outline-none resize-y focus:ring-2 focus:ring-accent/30" />
            {previews.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {previews.map((src, i) => (
                  <div key={src} className="relative">
                    <img src={src} alt="" className="w-20 h-20 rounded-xl object-cover border border-border" />
                    <button onClick={() => removeFile(i)} disabled={posting} aria-label="Зураг хасах"
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button onClick={() => fileRef.current?.click()} disabled={posting || files.length >= MAX_IMAGES}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border border-border text-xs font-bold text-on-surface-muted
                  hover:bg-card-hover disabled:opacity-40">
                <ImagePlus size={14} /> Зураг ({files.length}/{MAX_IMAGES})
              </button>
              <input ref={fileRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp" className="hidden"
                onChange={(e) => addFiles(Array.from(e.target.files || []))} />
              <button onClick={submit} disabled={posting || !title.trim()}
                className="ml-auto flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-accent text-white text-sm font-black
                  hover:opacity-90 active:scale-95 disabled:opacity-50">
                {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Нийтлэх
              </button>
            </div>
          </div>
        )}

        {/* Мэдээнүүд */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-on-surface-muted text-sm">
            <GraduationCap size={32} className="mx-auto mb-3 opacity-40" />
            Одоогоор мэдээ алга
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((p) => {
              const cat = teacherCategory(p.category);
              const canDelete = isAdminUser || p.userName === me;
              return (
                <article key={p.id} className="rounded-3xl border border-border-subtle bg-surface-elevated overflow-hidden">
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black text-white bg-gradient-to-r ${CATEGORY_STYLE[p.category]}`}>
                        {cat?.emoji} {cat?.name}
                      </span>
                      <span className="text-[10px] text-on-surface-muted ml-auto">{dateLabel(p.createdAt)}</span>
                      {canDelete && canPost && (
                        <button onClick={() => remove(p)} aria-label="Устгах" className="p-1 rounded-lg hover:bg-red-500/10">
                          <Trash2 size={13} className="text-red-400" />
                        </button>
                      )}
                    </div>
                    <h2 className="font-black text-base leading-snug">{p.title}</h2>
                    {p.text && <p className="text-sm text-on-surface/90 whitespace-pre-wrap break-words leading-relaxed">{p.text}</p>}
                  </div>
                  {p.images.length > 0 && (
                    <div className={`grid gap-0.5 ${p.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                      {p.images.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt="" loading="lazy"
                            className={`w-full object-cover ${p.images.length === 1 ? "max-h-96" : "aspect-square"}`} />
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="px-4 py-2.5 flex items-center gap-2 border-t border-border-subtle">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-emerald-500/15 flex items-center justify-center text-[10px] font-black text-emerald-400">
                      {p.authorAvatar ? <img src={p.authorAvatar} alt="" className="w-full h-full object-cover" /> : p.authorName[0]?.toUpperCase()}
                    </div>
                    <span className="text-xs font-bold">{p.authorName}</span>
                    <GraduationCap size={12} className="text-emerald-400" />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
