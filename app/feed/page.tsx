"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Send, Loader2, X, Heart, MessageSquare, Trash2 } from "lucide-react";
import Skeleton from "@/app/_components/Skeleton";
import AppHeader from "@/app/_components/AppHeader";

type Post = {
  id: string;
  userName: string;
  text: string;
  images: string[];
  createdAt: string;
  likeCount: number;
  commentCount: number;
  liked: boolean;
};

type Comment = {
  id: string;
  userName: string;
  text: string;
  createdAt: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Дөнгөж сая";
  if (mins < 60) return `${mins} мин`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} цаг`;
  return `${Math.floor(hrs / 24)} өдөр`;
}

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [me, setMe] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/posts");
      if (res.ok) setPosts(await res.json());
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => {
    const name = localStorage.getItem("name") ?? "";
    setMe(name.toLowerCase());
    setIsAdmin(localStorage.getItem("role") === "ADMIN" || name.toLowerCase() === "admin");
    fetchPosts();
  }, []);

  const deletePost = async (postId: string) => {
    setDeleting(postId);
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      if (openComments === postId) setOpenComments(null);
      toast.success("Нийтлэл устгагдлаа");
    } catch { toast.error("Устгахад алдаа гарлаа"); }
    setDeleting(null);
    setConfirmDelete(null);
  };

  const addFiles = (picked: File[]) => {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    const valid = picked.filter((f) => allowed.has(f.type) && f.size < 5 * 1024 * 1024);
    if (valid.length < picked.length) toast.error("Зөвхөн JPG/PNG/WEBP, 5MB хүртэл");
    const next = [...files, ...valid].slice(0, 4);
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

  const submitPost = async () => {
    if (!text.trim() && files.length === 0) return;
    setPosting(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (res.ok) { const j = await res.json(); if (j.url) urls.push(j.url); }
      }
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: text.trim(), images: urls }),
      });
      if (res.ok) {
        setText(""); setFiles([]); previews.forEach((u) => URL.revokeObjectURL(u)); setPreviews([]);
        toast.success("Нийтлэгдлээ!");
        await fetchPosts();
      }
    } catch { toast.error("Алдаа гарлаа"); }
    setPosting(false);
  };

  const toggleLike = async (postId: string) => {
    // Optimistic update
    setPosts((prev) => prev.map((p) =>
      p.id === postId ? { ...p, liked: !p.liked, likeCount: p.likeCount + (p.liked ? -1 : 1) } : p
    ));
    try {
      await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    } catch {
      // Revert
      setPosts((prev) => prev.map((p) =>
        p.id === postId ? { ...p, liked: !p.liked, likeCount: p.likeCount + (p.liked ? 1 : -1) } : p
      ));
    }
  };

  const loadComments = async (postId: string) => {
    if (openComments === postId) { setOpenComments(null); return; }
    setOpenComments(postId);
    setLoadingComments(true);
    setCommentText("");
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (res.ok) setComments(await res.json());
    } catch { /* */ }
    setLoadingComments(false);
  };

  const submitComment = async () => {
    if (!commentText.trim() || !openComments) return;
    try {
      const res = await fetch(`/api/posts/${openComments}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: commentText.trim() }),
      });
      if (res.ok) {
        const c = await res.json();
        setComments((prev) => [...prev, c]);
        setCommentText("");
        setPosts((prev) => prev.map((p) =>
          p.id === openComments ? { ...p, commentCount: p.commentCount + 1 } : p
        ));
      }
    } catch { toast.error("Алдаа"); }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      <AppHeader title="11A Мэдээний самбар" />

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* New post */}
        <div className="bg-surface-elevated border border-border rounded-2xl p-4 space-y-3">
          <textarea value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Юу бодож байна...?" rows={3}
            className="w-full bg-transparent text-on-surface placeholder:text-on-surface-muted/50 outline-none text-sm resize-none" />
          {previews.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {previews.map((u, i) => (
                <div key={u} className="relative">
                  <img src={u} alt="" className="w-full h-20 object-cover rounded-xl border border-border" />
                  <button onClick={() => removeFile(i)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-on-surface-muted hover:text-accent transition-colors">
              <ImagePlus size={16} /> Зураг
            </button>
            <input ref={fileRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp" className="hidden"
              onChange={(e) => addFiles(Array.from(e.target.files || []))} />
            <button onClick={submitPost} disabled={posting || (!text.trim() && files.length === 0)}
              className="px-4 py-2 rounded-xl bg-accent/20 border border-accent/30 text-accent text-xs font-bold
                hover:bg-accent/30 disabled:opacity-40 transition-all flex items-center gap-1.5">
              {posting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Нийтлэх
            </button>
          </div>
        </div>

        {/* Posts */}
        {loading ? (
          <div className="space-y-6 stagger-in">
            <div className="bg-surface-elevated border border-border rounded-2xl p-4 space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            {[1,2,3].map(i => (
              <div key={i} className="bg-surface-elevated border border-border-subtle rounded-2xl overflow-hidden">
                <div className="p-4 pb-2 flex items-center gap-2">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-1"><Skeleton className="h-3.5 w-20 rounded-md" /><Skeleton className="h-2.5 w-12 rounded-md" /></div>
                </div>
                <Skeleton className="h-4 w-full px-4" style={{ margin: '0 16px' }} />
                <Skeleton className="h-48 w-full rounded-none" style={{ borderRadius: 0 }} />
                <div className="flex gap-3 p-3">
                  <Skeleton className="h-8 w-16 rounded-xl" />
                  <Skeleton className="h-8 w-16 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-on-surface-muted text-sm">Мэдээ байхгүй байна</div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-surface-elevated border border-border-subtle rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-2 p-4 pb-2">
                <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">
                  {post.userName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{post.userName}</p>
                  <p className="text-[10px] text-on-surface-muted">{timeAgo(post.createdAt)}</p>
                </div>
                {(post.userName.toLowerCase() === me || isAdmin) && (
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

              {/* Content */}
              {post.text && <p className="text-sm leading-relaxed px-4 pb-2">{post.text}</p>}
              {post.images.length > 0 && (
                <div className={`grid gap-0.5 ${post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                  {post.images.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-full object-cover max-h-72" />
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1 px-3 py-2 border-t border-border-subtle">
                <button onClick={() => toggleLike(post.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all
                    ${post.liked ? "text-red-400 bg-red-500/10" : "text-on-surface-muted hover:bg-card-hover"}`}>
                  <Heart size={15} className={post.liked ? "fill-red-400" : ""} />
                  {post.likeCount > 0 && post.likeCount}
                </button>
                <button onClick={() => loadComments(post.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all
                    ${openComments === post.id ? "text-accent bg-accent/10" : "text-on-surface-muted hover:bg-card-hover"}`}>
                  <MessageSquare size={15} />
                  {post.commentCount > 0 && post.commentCount}
                </button>
              </div>

              {/* Comments section */}
              {openComments === post.id && (
                <div className="border-t border-border-subtle px-4 py-3 space-y-3">
                  {loadingComments ? (
                    <div className="space-y-2 py-2"><Skeleton className="h-8 w-full rounded-xl" /><Skeleton className="h-8 w-3/4 rounded-xl" /></div>
                  ) : comments.length === 0 ? (
                    <p className="text-xs text-on-surface-muted text-center py-2">Сэтгэгдэл байхгүй</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-accent text-[9px] font-bold shrink-0 mt-0.5">
                          {c.userName[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs"><span className="font-bold">{c.userName}</span> <span className="text-on-surface-muted">{timeAgo(c.createdAt)}</span></p>
                          <p className="text-sm mt-0.5">{c.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {/* Comment input */}
                  <div className="flex gap-2 pt-1">
                    <input value={commentText} onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitComment()}
                      placeholder="Сэтгэгдэл бичих..."
                      className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-xs
                        text-on-surface placeholder:text-on-surface-muted/50 outline-none focus:ring-1 focus:ring-accent/30" />
                    <button onClick={submitComment} disabled={!commentText.trim()}
                      className="px-3 py-2 rounded-xl bg-accent/20 text-accent text-xs font-bold disabled:opacity-40 transition-all">
                      <Send size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
