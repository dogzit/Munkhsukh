"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Shuffle, Loader2, Check, Search, RotateCcw, Users, Repeat } from "lucide-react";
import AppHeader from "@/app/_components/AppHeader";
import { BRANCHES } from "@/lib/branches";

type Student = {
  name: string;
  fullName: string | null;
  avatar: string | null;
  branch: number | null;
};

const STORAGE_KEY = "random-picker-v2";

type Saved = { selected: string[] | null; noRepeat: boolean; picked: string[] };

function load(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function save(s: Saved) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch { /* */ }
}

function randomIndex(n: number) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % n;
}

const label = (s: Student) => s.fullName || s.name;

export default function RandomStudentPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  // null = бүх сурагч
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [noRepeat, setNoRepeat] = useState(false);
  // Давтахгүй горимд аль хэдийн сонгогдсон хүмүүс
  const [picked, setPicked] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [q, setQ] = useState("");

  const [result, setResult] = useState<Student | null>(null);
  const [rolling, setRolling] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [history, setHistory] = useState<Student[]>([]);
  const restored = useRef(false);

  useEffect(() => {
    fetch("/api/students")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Student[]) => {
        setStudents(list);
        const s = load();
        if (s) {
          const names = new Set(list.map((x) => x.name));
          setSelected(s.selected ? new Set(s.selected.filter((n) => names.has(n))) : null);
          setNoRepeat(!!s.noRepeat);
          setPicked((s.picked ?? []).filter((n) => names.has(n)));
        }
        restored.current = true;
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Тохиргоог хадгална (хуудас дахин нээхэд үлдэнэ)
  useEffect(() => {
    if (!restored.current) return;
    save({ selected: selected ? [...selected] : null, noRepeat, picked });
  }, [selected, noRepeat, picked]);

  const pool = useMemo(
    () => (selected ? students.filter((s) => selected.has(s.name)) : students),
    [students, selected],
  );
  const remaining = useMemo(
    () => (noRepeat ? pool.filter((s) => !picked.includes(s.name)) : pool),
    [pool, picked, noRepeat],
  );

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return students.filter(
      (s) => !ql || s.name.toLowerCase().includes(ql) || (s.fullName ?? "").toLowerCase().includes(ql),
    );
  }, [students, q]);

  const isOn = (name: string) => (selected ? selected.has(name) : true);

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev ?? students.map((s) => s.name));
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next.size === students.length ? null : next;
    });
  };

  const selectOnly = (names: string[]) => setSelected(new Set(names));

  const pick = () => {
    if (spinning || remaining.length === 0) return;
    setSpinning(true);
    setResult(null);
    const winner = remaining[randomIndex(remaining.length)];

    // Нэрс гүйлгэх хөдөлгөөн — сонгох боломжтой хүмүүсийн нэрсээр
    let i = 0;
    const steps = 16;
    const tick = () => {
      if (i < steps) {
        setRolling(label(remaining[randomIndex(remaining.length)]));
        i++;
        setTimeout(tick, 40 + i * 8);
      } else {
        setRolling(null);
        setResult(winner);
        setHistory((h) => [winner, ...h.slice(0, 9)]);
        if (noRepeat) setPicked((p) => [...p, winner.name]);
        setSpinning(false);
      }
    };
    tick();
  };

  const resetRound = () => {
    setPicked([]);
    setResult(null);
  };

  const shown = rolling ?? (result ? label(result) : null);

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col items-center font-sans">
      <AppHeader
        title="Сурагч сонгох"
        icon={<Shuffle size={18} className="text-violet-400 shrink-0" />}
      />

      <div className="flex-1 flex flex-col items-center px-4 py-6 w-full max-w-sm gap-4">
        {/* Үр дүн */}
        <div className="w-full bg-surface-elevated border border-border rounded-3xl p-7 text-center shadow-2xl">
          {result && !rolling && (
            <div className="w-16 h-16 mx-auto mb-3 rounded-full overflow-hidden bg-accent/15 flex items-center justify-center text-accent text-2xl font-black">
              {result.avatar ? <img src={result.avatar} alt="" className="w-full h-full object-cover" /> : label(result)[0]?.toUpperCase()}
            </div>
          )}
          <div className={`text-3xl font-black mb-2 break-words transition-all duration-150 ${spinning ? "scale-105 opacity-80" : ""}`}>
            {shown ?? "?"}
          </div>
          <p className="text-on-surface-muted text-sm">
            {spinning
              ? "Сонгож байна..."
              : result
                ? "Сонгогдлоо! 🎉"
                : remaining.length === 0 && noRepeat && pool.length > 0
                  ? "Бүгд сонгогдсон 👏"
                  : "Товч дарж сурагч сонгоно уу"}
          </p>
        </div>

        {/* Тохиргоо */}
        <div className="w-full grid grid-cols-2 gap-2">
          <button
            onClick={() => setShowPicker((v) => !v)}
            className={`flex items-center gap-2 px-3 py-3 rounded-2xl border text-left transition-all active:scale-95
              ${showPicker ? "border-accent/40 bg-accent/10" : "border-border bg-surface-elevated"}`}
          >
            <Users size={16} className="text-accent shrink-0" />
            <span className="min-w-0">
              <span className="block text-xs font-black">Хэнээс сонгох</span>
              <span className="block text-[10px] text-on-surface-muted truncate">
                {selected ? `${pool.length} сурагч` : `Бүгд (${students.length})`}
              </span>
            </span>
          </button>
          <button
            onClick={() => { setNoRepeat((v) => !v); setPicked([]); }}
            role="switch"
            aria-checked={noRepeat}
            className={`flex items-center gap-2 px-3 py-3 rounded-2xl border text-left transition-all active:scale-95
              ${noRepeat ? "border-emerald-500/40 bg-emerald-500/10" : "border-border bg-surface-elevated"}`}
          >
            <Repeat size={16} className={noRepeat ? "text-emerald-400 shrink-0" : "text-on-surface-muted shrink-0"} />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-black">Нэг хүн нэг удаа</span>
              <span className="block text-[10px] text-on-surface-muted">{noRepeat ? "Асаалттай" : "Унтраалттай"}</span>
            </span>
            <span className={`w-8 h-5 rounded-full p-0.5 shrink-0 transition-colors ${noRepeat ? "bg-emerald-500" : "bg-border"}`}>
              <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${noRepeat ? "translate-x-3" : ""}`} />
            </span>
          </button>
        </div>

        {noRepeat && pool.length > 0 && (
          <div className="w-full flex items-center gap-2 text-xs">
            <div className="flex-1 h-2 rounded-full bg-surface-elevated border border-border-subtle overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(1 - remaining.length / pool.length) * 100}%` }} />
            </div>
            <span className="text-on-surface-muted tabular-nums shrink-0">{remaining.length}/{pool.length} үлдсэн</span>
            <button onClick={resetRound} className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-card-hover font-bold shrink-0">
              <RotateCcw size={12} /> Шинээр
            </button>
          </div>
        )}

        {/* Сурагч сонгох жагсаалт */}
        {showPicker && (
          <div className="w-full rounded-3xl border border-border bg-surface-elevated p-3 space-y-2.5">
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              <button onClick={() => setSelected(null)}
                className="shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-border bg-surface hover:bg-card-hover">
                Бүгд
              </button>
              <button onClick={() => selectOnly([])}
                className="shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-border bg-surface hover:bg-card-hover">
                Цэвэрлэх
              </button>
              {BRANCHES.map((b) => (
                <button key={b.id}
                  onClick={() => selectOnly(students.filter((s) => s.branch === b.id).map((s) => s.name))}
                  className="shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-border bg-surface hover:bg-card-hover">
                  {b.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-3 py-2">
              <Search size={14} className="text-on-surface-muted shrink-0" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Нэрээр хайх..."
                className="flex-1 min-w-0 bg-transparent outline-none text-sm" />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1 -mx-1 px-1">
              {loading ? (
                <div className="py-6 flex justify-center"><Loader2 size={16} className="animate-spin text-on-surface-muted" /></div>
              ) : (
                filtered.map((s) => {
                  const on = isOn(s.name);
                  const done = noRepeat && picked.includes(s.name);
                  return (
                    <button key={s.name} onClick={() => toggle(s.name)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors
                        ${on ? "bg-accent/10" : "hover:bg-card-hover"}`}>
                      <span className={`w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center
                        ${on ? "bg-accent border-accent" : "border-border"}`}>
                        {on && <Check size={12} className="text-white" strokeWidth={3} />}
                      </span>
                      <span className={`flex-1 min-w-0 text-sm font-semibold truncate ${done ? "line-through opacity-50" : ""}`}>
                        {label(s)}
                      </span>
                      {s.branch && <span className="text-[10px] text-on-surface-muted shrink-0">{s.branch}-р салаа</span>}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Сонгох товч */}
        <button
          onClick={pick}
          disabled={spinning || loading || remaining.length === 0}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600
            text-white font-black uppercase tracking-wider text-sm
            hover:from-violet-500 hover:to-indigo-500 hover:scale-[1.02] hover:shadow-xl
            active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100
            transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
        >
          {spinning ? <Loader2 size={18} className="animate-spin" /> : <Shuffle size={18} />}
          {spinning
            ? "Сонгож байна..."
            : pool.length === 0
              ? "Сурагч сонгоогүй байна"
              : remaining.length === 0
                ? "Бүгд сонгогдсон"
                : `Санамсаргүй сонгох (${remaining.length})`}
        </button>

        {/* Түүх */}
        {history.length > 0 && (
          <div className="w-full mt-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-muted mb-2">Түүх</p>
            <div className="space-y-1.5">
              {history.map((h, i) => (
                <div key={`${h.name}-${i}`} className="flex items-center gap-2 px-3 py-2 bg-surface-elevated border border-border-subtle rounded-xl text-sm">
                  <span className="text-on-surface-muted text-xs w-5">{i + 1}.</span>
                  <span className="font-semibold truncate">{label(h)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
