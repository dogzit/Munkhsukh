"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Send, Loader2, X, Trash2, Users, Lock } from "lucide-react";
import Skeleton from "@/app/_components/Skeleton";
import AppHeader from "@/app/_components/AppHeader";
import { BRANCHES, branchName } from "@/lib/branches";

type Member = { name: string; fullName: string | null; avatar: string | null };

type BranchInfo = {
  myBranch: number | null;
  isAdmin: boolean;
  members: Record<number, Member[]>;
};

type BranchPost = {
  id: string;
  userName: string;
  fullName: string | null;
  avatar: string | null;
  text: string;
  images: string[];
  createdAt: string;
};

const MAX_IMAGES = 6;

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Дөнгөж сая";
  if (mins < 60) return `${mins} мин`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} цаг`;
  return `${Math.floor(hrs / 24)} өдөр`;
}

function Avatar({ name, avatar, size = 9 }: { name: string; avatar: string | null; size?: number }) {
  const cls = size === 9 ? "w-9 h-9 text-xs" : "w-7 h-7 text-[10px]";
  return (
    <div className={`${cls} rounded-full overflow-hidden bg-accent/20 flex items-center justify-center text-accent font-bold shrink-0`}>
      {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : name[0]?.toUpperCase()}
    </div>
  );
}

export default function BranchPage() {
  const [info, setInfo] = useState<BranchInfo | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [posts, setPosts] = useState<BranchPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [choosing, setChoosing] = useState<number | null>(null);
  const [me, setMe] = useState("");

  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/branch");
      if (!res.ok) throw new Error();
      const data: BranchInfo = await res.json();
      setInfo(data);
      setViewing((v) => v ?? data.myBranch ?? (data.isAdmin ? 1 : null));
    } catch {
      toast.error("Салааны мэдээлэл ачаалахад алдаа гарлаа");
    }
  }, []);

  const loadPosts = useCallback(async (branch: number) => {
    setLoadingPosts(true);
    try {
      const res = await fetch(`/api/branch/posts?branch=${branch}`);
      if (res.ok) setPosts(await res.json());
      else setPosts([]);
    } catch { /* */ }
    setLoadingPosts(false);
  }, []);

  useEffect(() => {
    setMe((localStorage.getItem("name") ?? "").toLowerCase());
    loadInfo();
  }, [loadInfo]);

  useEffect(() => {
    if (viewing) loadPosts(viewing);
  }, [viewing, loadPosts]);

  const chooseBranch = async (id: number) => {
    if (!window.confirm(`${branchName(id)}-г сонгох уу?\nДараа нь солих бол админд хандана.`)) return;
    setChoosing(id);
    try {
      const res = await fetch("/api/branch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ branch: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      toast.success(`${branchName(id)}-д нэгдлээ 🎉`);
      setViewing(id);
      await loadInfo();
    } catch (e) {
      toast.error((e as Error).message || "Алдаа гарлаа");
    }
    setChoosing(null);
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
    if ((!text.trim() && files.length === 0) || posting) return;
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
      const res = await fetch("/api/branch/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: text.trim(), images: urls }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      setText("");
      previews.forEach((u) => URL.revokeObjectURL(u));
      setFiles([]);
      setPreviews([]);
      toast.success("Нийтлэгдлээ!");
      if (viewing) await loadPosts(viewing);
    } catch (e) {
      toast.error((e as Error).message || "Алдаа гарлаа");
    }
    setPosting(false);
  };

  const deletePost = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/branch/posts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Устгагдлаа");
    } catch {
      toast.error("Устгахад алдаа гарлаа");
    }
    setDeleting(null);
    setConfirmDelete(null);
  };

  // ── Ачаалж байна ──
  if (!info) {
    return (
      <div className="min-h-screen bg-surface text-on-surface font-sans">
        <AppHeader title="Салаа" />
        <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  // ── Салаа сонгоогүй ──
  if (!info.myBranch && !info.isAdmin) {
    return (
      <div className="min-h-screen bg-surface text-on-surface font-sans">
        <AppHeader title="Салаа сонгох" />
        <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
          <div className="text-center space-y-1 pb-2">
            <p className="text-lg font-black">Та аль салаанд суудаг вэ?</p>
            <p className="text-xs text-on-surface-muted">
              Салааныхаа хэсэгт зөвхөн салааныхан тань орно. Нэг сонгосны дараа солих бол админд хандана.
            </p>
          </div>
          {BRANCHES.map((b) => {
            const members = info.members[b.id] ?? [];
            return (
              <button key={b.id} onClick={() => chooseBranch(b.id)} disabled={choosing !== null}
                className="w-full text-left rounded-2xl border border-border bg-surface-elevated overflow-hidden
                  hover:border-accent/40 active:scale-[0.98] disabled:opacity-60 transition-all">
                <div className={`bg-gradient-to-br ${b.gradient} px-4 py-3 flex items-center justify-between`}>
                  <p className="font-black text-white">{b.name}</p>
                  {choosing === b.id ? (
                    <Loader2 size={16} className="animate-spin text-white" />
                  ) : (
                    <span className="text-[10px] font-bold text-white/90 bg-black/20 px-2 py-0.5 rounded-full">
                      {members.length} хүн
                    </span>
                  )}
                </div>
                <div className="px-4 py-3 text-xs text-on-surface-muted">
                  {members.length === 0
                    ? "Одоогоор хэн ч сонгоогүй"
                    : members.map((m) => m.fullName || m.name).join(", ")}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const current = BRANCHES.find((b) => b.id === viewing) ?? BRANCHES[0];
  const members = info.members[current.id] ?? [];
  const canPost = info.myBranch === current.id;

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      <AppHeader title={current.name} subtitle={`${members.length} гишүүн`} />

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        {/* Админ: салаа солих таб */}
        {info.isAdmin && (
          <div className="flex gap-1 p-1 rounded-2xl bg-surface-elevated border border-border">
            {BRANCHES.map((b) => (
              <button key={b.id} onClick={() => setViewing(b.id)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all
                  ${viewing === b.id ? "bg-accent/20 text-accent" : "text-on-surface-muted hover:bg-card-hover"}`}>
                {b.name}
                {info.myBranch === b.id && " •"}
              </button>
            ))}
          </div>
        )}

        {/* Салааны карт + гишүүд */}
        <div className="rounded-2xl border border-border bg-surface-elevated overflow-hidden">
          <div className={`bg-gradient-to-br ${current.gradient} px-4 py-4`}>
            <p className="text-xl font-black text-white">{current.name}</p>
            <p className="text-[11px] text-white/80 flex items-center gap-1 mt-0.5">
              <Lock size={11} /> Зөвхөн салааныхан харна
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] font-black text-on-surface-muted uppercase tracking-widest mb-2 flex items-center gap-1">
              <Users size={11} /> Гишүүд ({members.length})
            </p>
            {members.length === 0 ? (
              <p className="text-xs text-on-surface-muted">Гишүүн алга</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {members.map((m) => (
                  <span key={m.name}
                    className="inline-flex items-center gap-1.5 pl-0.5 pr-2.5 py-0.5 rounded-full bg-surface border border-border-subtle text-xs">
                    <Avatar name={m.name} avatar={m.avatar} size={7} />
                    {m.fullName || m.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Нийтлэх */}
        {canPost && (
          <div className="bg-surface-elevated border border-border rounded-2xl p-4 space-y-3">
            <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000}
              placeholder="Хийсэн даалгавраа тайлбарлаад зургаа хавсаргаарай..." rows={3}
              className="w-full bg-transparent text-on-surface placeholder:text-on-surface-muted/50 outline-none text-sm resize-none" />
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((u, i) => (
                  <div key={u} className="relative">
                    <img src={u} alt="" className="w-full h-24 object-cover rounded-xl border border-border" />
                    <button onClick={() => removeFile(i)} disabled={posting} aria-label="Зураг хасах"
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              <button onClick={() => fileRef.current?.click()} disabled={posting || files.length >= MAX_IMAGES}
                className="flex items-center gap-1.5 text-xs text-on-surface-muted hover:text-accent disabled:opacity-40 transition-colors">
                <ImagePlus size={16} /> Зураг ({files.length}/{MAX_IMAGES})
              </button>
              <input ref={fileRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp" className="hidden"
                onChange={(e) => addFiles(Array.from(e.target.files || []))} />
              <button onClick={submit} disabled={posting || (!text.trim() && files.length === 0)}
                className="px-4 py-2 rounded-xl bg-accent/20 border border-accent/30 text-accent text-xs font-bold
                  hover:bg-accent/30 disabled:opacity-40 transition-all flex items-center gap-1.5">
                {posting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Нийтлэх
              </button>
            </div>
          </div>
        )}

        {/* Нийтлэлүүд */}
        {loadingPosts ? (
          <div className="space-y-4">
            {[1, 2].map((i) => <Skeleton key={i} className="h-56 w-full rounded-2xl" />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-14 text-on-surface-muted text-sm">
            Одоогоор нийтлэл алга{canPost ? ". Эхний даалгавраа хуваалцаарай! 📚" : ""}
          </div>
        ) : (
          posts.map((post) => {
            const mine = post.userName.toLowerCase() === me;
            return (
              <div key={post.id} className="bg-surface-elevated border border-border-subtle rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 p-4 pb-2">
                  <Avatar name={post.userName} avatar={post.avatar} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{post.fullName || post.userName}</p>
                    <p className="text-[10px] text-on-surface-muted">@{post.userName} • {timeAgo(post.createdAt)}</p>
                  </div>
                  {(mine || info.isAdmin) && (
                    confirmDelete === post.id ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-on-surface-muted">Устгах уу?</span>
                        <button onClick={() => deletePost(post.id)} disabled={deleting === post.id}
                          className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold hover:bg-red-500/20 disabled:opacity-50 transition-all">
                          {deleting === post.id ? <Loader2 size={11} className="animate-spin" /> : "Тийм"}
                        </button>
                        <button onClick={() => setConfirmDelete(null)} disabled={deleting === post.id}
                          className="px-2.5 py-1 rounded-lg border border-border text-on-surface-muted text-[10px] font-bold hover:bg-card-hover transition-all">
                          Үгүй
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(post.id)} aria-label="Нийтлэл устгах"
                        className="p-2 rounded-xl text-on-surface-muted hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0">
                        <Trash2 size={15} />
                      </button>
                    )
                  )}
                </div>
                {post.text && <p className="text-sm leading-relaxed px-4 pb-3 whitespace-pre-wrap">{post.text}</p>}
                {post.images.length > 0 && (
                  <div className={`grid gap-0.5 ${post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                    {post.images.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="" loading="lazy" className="w-full object-cover max-h-80" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
