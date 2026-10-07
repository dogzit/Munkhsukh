"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Reply, Trash2, X, Pencil, Check } from "lucide-react";
import Skeleton from "@/app/_components/Skeleton";
import AppHeader from "@/app/_components/AppHeader";

type Message = {
  id: string;
  userName: string;
  text: string;
  replyToId: string | null;
  reaction: string[];
  createdAt: string;
};

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

const NAME_COLORS = [
  "text-violet-400", "text-cyan-400", "text-pink-400", "text-emerald-400",
  "text-amber-400", "text-rose-400", "text-blue-400", "text-teal-400",
];

function nameColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return NAME_COLORS[Math.abs(hash) % NAME_COLORS.length];
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" });
}

// Parse reactions: ["user1:👍", "user2:❤️"] → { "👍": ["user1"], "❤️": ["user2"] }
function parseReactions(arr: string[]) {
  const map: Record<string, string[]> = {};
  for (const r of arr) {
    const [user, emoji] = r.split(":");
    if (!emoji) continue;
    if (!map[emoji]) map[emoji] = [];
    map[emoji].push(user);
  }
  return map;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userName, setUserName] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reactMenu, setReactMenu] = useState<string | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/chat");
      if (res.ok) setMessages(await res.json());
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => {
    // Effect-ийн шууд setState-ийг зөрүүлэхгүйн тулд timeout ашиглана
    const t = setTimeout(() => {
      setUserName(localStorage.getItem("name") ?? "");
      setIsAdmin(localStorage.getItem("role") === "ADMIN");
      fetchMessages();
    }, 0);
    intervalRef.current = setInterval(fetchMessages, 3000);
    return () => {
      clearTimeout(t);
      clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const startEdit = (msg: Message) => {
    setReplyTo(null);
    setSelectedMsg(null);
    setEditing(msg);
    setText(msg.text);
    inputRef.current?.focus();
  };

  const cancelEdit = () => {
    setEditing(null);
    setText("");
  };

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;

    if (editing) {
      const id = editing.id;
      setSending(true);
      try {
        const res = await fetch(`/api/chat/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: t }),
        });
        if (res.ok) {
          setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: t } : m)));
          cancelEdit();
        }
      } catch { /* */ }
      setSending(false);
      return;
    }

    setSending(true);
    setText("");
    const replyId = replyTo?.id ?? null;
    setReplyTo(null);
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: t, replyToId: replyId }),
      });
      await fetchMessages();
    } catch { /* */ }
    setSending(false);
  };

  const deleteMsg = async (id: string) => {
    try {
      await fetch(`/api/chat/${id}`, { method: "DELETE" });
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch { /* */ }
  };

  const react = async (msgId: string, emoji: string) => {
    setReactMenu(null);
    try {
      await fetch(`/api/chat/${msgId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      await fetchMessages();
    } catch { /* */ }
  };

  const getReplyText = (id: string | null) => {
    if (!id) return null;
    const msg = messages.find((m) => m.id === id);
    return msg ? `${msg.userName}: ${msg.text.slice(0, 40)}${msg.text.length > 40 ? "..." : ""}` : null;
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col font-sans">
      {/* Header */}
      <AppHeader
        title="11A Ангийн Чат"
        subtitle={`${messages.length} мессеж`}
      >
        <div className="ml-auto w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0" />
      </AppHeader>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2" onClick={() => { setReactMenu(null); setSelectedMsg(null); }}>
        {loading ? (
          <div className="space-y-4 py-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[70%] space-y-1.5">
                  {i % 2 !== 0 && <Skeleton className="h-2.5 w-16 rounded-md ml-2" />}
                  <Skeleton className="h-10 rounded-2xl" style={{ width: `${60 + (i % 4) * 8}%` }} />
                  <Skeleton className="h-2 w-12 rounded-md ml-2" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20 text-on-surface-muted text-sm">Эхний мессежээ бичээрэй!</div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userName === userName;
            const reactions = parseReactions(msg.reaction || []);
            const replyText = getReplyText(msg.replyToId);

            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} group`}>
                <div className={`max-w-[80%] ${isMe ? "items-end" : "items-start"}`}>
                  {!isMe && (
                    <p className={`text-[10px] font-bold mb-0.5 ml-2 ${nameColor(msg.userName)}`}>{msg.userName}</p>
                  )}

                  {/* Reply preview */}
                  {replyText && (
                    <div className="text-[10px] text-on-surface-muted bg-accent/5 border-l-2 border-accent px-2 py-1.5 mx-2 mb-1 rounded-r-lg">
                      <span className="font-bold text-accent">↩</span> {replyText}
                    </div>
                  )}

                  <div className="relative">
                    <div
                      onClick={(e) => { e.stopPropagation(); setSelectedMsg(selectedMsg === msg.id ? null : msg.id); setReactMenu(null); }}
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed cursor-pointer
                      ${isMe ? "bg-accent/20 text-on-surface rounded-br-sm" : "bg-surface-elevated border border-border-subtle text-on-surface rounded-bl-sm"}`}
                    >
                      {msg.text}
                    </div>

                    {/* Actions — shown on hover (desktop) or tap (mobile) */}
                    <div className={`absolute top-0 ${isMe ? "-left-28" : "-right-20"} transition-opacity flex gap-0.5
                      ${selectedMsg === msg.id ? "opacity-100" : "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"}
                    `}>
                      <button onClick={(e) => { e.stopPropagation(); if (editing) cancelEdit(); setReplyTo(msg); inputRef.current?.focus(); }}
                        className="p-1.5 hover:bg-card-hover rounded-lg transition-all" title="Хариулах">
                        <Reply size={12} className="text-on-surface-muted" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setReactMenu(reactMenu === msg.id ? null : msg.id); }}
                        className="p-1.5 hover:bg-card-hover rounded-lg transition-all" title="React">
                        <span className="text-xs">😊</span>
                      </button>
                      {isMe && (
                        <button onClick={(e) => { e.stopPropagation(); startEdit(msg); }}
                          className="p-1.5 hover:bg-card-hover rounded-lg transition-all" title="Засах">
                          <Pencil size={12} className="text-on-surface-muted" />
                        </button>
                      )}
                      {(isMe || isAdmin) && (
                        <button onClick={() => deleteMsg(msg.id)}
                          className="p-1.5 hover:bg-red-500/10 rounded-lg transition-all" title="Устгах">
                          <Trash2 size={12} className="text-red-400" />
                        </button>
                      )}
                    </div>

                    {/* React menu */}
                    {reactMenu === msg.id && (
                      <div className={`absolute bottom-full mb-1 ${isMe ? "right-0" : "left-0"} bg-surface border border-border rounded-xl shadow-xl px-1 py-1 flex gap-0.5 z-20`}
                        onClick={(e) => e.stopPropagation()}>
                        {QUICK_REACTIONS.map((emoji) => (
                          <button key={emoji} onClick={() => react(msg.id, emoji)}
                            className="w-8 h-8 rounded-lg hover:bg-card-hover transition-all flex items-center justify-center text-base hover:scale-125">
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reactions display */}
                  {Object.keys(reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 mx-2">
                      {Object.entries(reactions).map(([emoji, users]) => (
                        <button key={emoji} onClick={() => react(msg.id, emoji)}
                          title={users.join(", ")}
                          className={`group/react relative px-1.5 py-0.5 rounded-full text-[10px] border transition-all
                            ${users.includes(userName) ? "bg-accent/15 border-accent/30" : "bg-surface-elevated border-border-subtle hover:bg-card-hover"}`}>
                          {emoji} {users.length}
                          {/* Tooltip — хэн дарснийг харуулна */}
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1
                            bg-surface border border-border rounded-lg text-[9px] text-on-surface-muted
                            whitespace-nowrap shadow-xl
                            opacity-0 group-hover/react:opacity-100 pointer-events-none transition-opacity z-30">
                            {users.join(", ")}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="text-[9px] text-on-surface-muted/50 mt-0.5 mx-2">{timeLabel(msg.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Edit bar */}
      {editing && (
        <div className="px-4 py-2 bg-surface-elevated border-t border-border flex items-center gap-2">
          <Pencil size={14} className="text-accent shrink-0" />
          <p className="text-xs text-on-surface-muted truncate flex-1">
            <span className="font-bold text-on-surface">Засаж байна</span>: {editing.text.slice(0, 60)}
          </p>
          <button onClick={cancelEdit} className="p-1 hover:bg-card-hover rounded-lg"><X size={14} /></button>
        </div>
      )}

      {/* Reply preview bar */}
      {replyTo && (
        <div className="px-4 py-2 bg-surface-elevated border-t border-border flex items-center gap-2">
          <Reply size={14} className="text-accent shrink-0" />
          <p className="text-xs text-on-surface-muted truncate flex-1">
            <span className="font-bold text-on-surface">{replyTo.userName}</span>: {replyTo.text.slice(0, 60)}
          </p>
          <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-card-hover rounded-lg"><X size={14} /></button>
        </div>
      )}

      {/* Input */}
      <div
        className="sticky bottom-[calc(3.5rem_+_env(safe-area-inset-bottom))] lg:bottom-0
          bg-surface/80 backdrop-blur-xl border-t border-border px-4 py-3"
      >
        <div className="flex gap-2 max-w-2xl mx-auto">
          <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
              if (e.key === "Escape" && editing) cancelEdit();
            }}
            placeholder={editing ? "Мессеж засах..." : replyTo ? "Хариулт бичих..." : "Мессеж бичих..."}
            maxLength={500}
            className="flex-1 min-w-0 bg-surface-elevated border border-border rounded-2xl px-4 py-3 text-sm
              text-on-surface placeholder:text-on-surface-muted/50 outline-none focus:ring-2 focus:ring-accent/30 transition-all" />
          <button onClick={send} disabled={!text.trim() || sending}
            className="w-11 h-11 rounded-2xl bg-accent/20 border border-accent/30 text-accent
              flex items-center justify-center hover:bg-accent/30 hover:scale-105 active:scale-95
              disabled:opacity-40 disabled:hover:scale-100 transition-all">
            {sending ? <Loader2 size={16} className="animate-spin" /> : editing ? <Check size={16} /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
