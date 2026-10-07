"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Camera,
  Save,
  Loader2,
  Instagram,
  Phone,
  Mail,
  CalendarDays,
  User,
  PartyPopper,
  Lock,
  KeyRound,
  X,
  AtSign,
} from "lucide-react";
import Skeleton from "@/app/_components/Skeleton";
import AppHeader from "@/app/_components/AppHeader";

type Profile = {
  name: string;
  avatar: string | null;
  bio: string | null;
  instagram: string | null;
  createdAt: string;
  totalTodos: number;
  completedTodos: number;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  fullName: string | null;
};

/** Тэмдэглэгдсэн өдрөө төрсөн өдөртэй таарч байгаа эсэхийг шалгана */
function isBirthdayToday(birthDate: string | null): boolean {
  if (!birthDate) return false;
  const bd = new Date(birthDate);
  const today = new Date();
  return bd.getUTCDate() === today.getUTCDate() && bd.getUTCMonth() === today.getUTCMonth();
}

/** Тухайн хэрэглэгчийн нас тооцно */
function getAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const bd = new Date(birthDate);
  const today = new Date();
  let age = today.getUTCFullYear() - bd.getUTCFullYear();
  const m = today.getUTCMonth() - bd.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < bd.getUTCDate())) age--;
  return age;
}

/** Баярын цаасны хэсэгүүд үүсгэх (индексээс хамаарсан тогтмол pseudo-random) */
function pseudoRandom(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function Confetti() {
  const colors = ["#f43f5e", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#ec4899"];
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: pseudoRandom(i) * 100,
    delay: pseudoRandom(i + 100) * 3,
    duration: 2 + pseudoRandom(i + 200) * 3,
    color: colors[i % colors.length],
    size: 6 + pseudoRandom(i + 300) * 8,
    rotation: pseudoRandom(i + 400) * 360,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti"
          style={{
            left: `${p.left}%`,
            top: "-20px",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.id % 2 === 0 ? "50%" : "2px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bio, setBio] = useState("");
  const [ig, setIg] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showBirthday, setShowBirthday] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showForgotPinModal, setShowForgotPinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [changingPin, setChangingPin] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [namePin, setNamePin] = useState("");
  const [changingName, setChangingName] = useState(false);
  const [forgotPinStep, setForgotPinStep] = useState<1 | 2>(1);
  const [forgotPinName, setForgotPinName] = useState("");
  const [forgotPinNew, setForgotPinNew] = useState("");
  const [forgotPinConfirm, setForgotPinConfirm] = useState("");
  const [forgotPinLoading, setForgotPinLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    try {
      const r = await fetch("/api/profile");
      const data = await r.json();
      setProfile(data);
      setBio(data.bio ?? "");
      setIg(data.instagram ?? "");
      setFullName(data.fullName ?? "");
      setPhone(data.phone ?? "");
      setEmail(data.email ?? "");
      setBirthDate(data.birthDate ? data.birthDate.split("T")[0] : "");

      // Төрсөн өдөр болвол цэлмэглэх
      if (isBirthdayToday(data.birthDate)) {
        setShowBirthday(true);
        toast("🎂 Төрсөн өдрийн мэнд хүргэе!", {
          duration: 8000,
          icon: "🎉",
        });
      }
    } catch {
      toast.error("Профайл ачаалахад алдаа");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const uploadAvatar = async (file: File) => {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(file.type)) {
      toast.error("Зөвхөн JPG/PNG/WEBP");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("2MB-аас бага байх ёстой");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const upRes = await fetch("/api/upload", { method: "POST", body: fd });
      if (!upRes.ok) throw new Error();
      const { url } = await upRes.json();

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ avatar: url }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile((p) => (p ? { ...p, avatar: updated.avatar } : p));
        toast.success("Зураг шинэчлэгдлээ!");
      }
    } catch {
      toast.error("Алдаа гарлаа");
    }
    setUploading(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bio: bio.trim(),
          instagram: ig.trim(),
          fullName: fullName.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          birthDate: birthDate || null,
        }),
      });
      if (res.ok) {
        toast.success("Хадгалагдлаа!");
        const updated = await res.json();
        setProfile((p) =>
          p
            ? {
                ...p,
                bio: updated.bio,
                instagram: updated.instagram,
                fullName: updated.fullName,
                phone: updated.phone,
                email: updated.email,
                birthDate: updated.birthDate,
              }
            : p
        );
      }
    } catch {
      toast.error("Алдаа");
    }
    setSaving(false);
  };

  /** PIN солих */
  const changePin = async () => {
    if (!currentPin || !newPin) {
      toast.error("Бүх талбарыг бөглөнө үү");
      return;
    }
    if (newPin !== confirmNewPin) {
      toast.error("Шинэ PIN таарахгүй байна");
      return;
    }
    if (newPin.length < 4 || newPin.length > 6) {
      toast.error("PIN 4-6 оронтой байх ёстой");
      return;
    }
    setChangingPin(true);
    try {
      const res = await fetch("/api/auth/change-pin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("PIN амжилттай солигдлоо!");
        setShowPinModal(false);
        setCurrentPin("");
        setNewPin("");
        setConfirmNewPin("");
      } else {
        toast.error(data.error || "Алдаа гарлаа");
      }
    } catch {
      toast.error("Сервертэй холбогдож чадсангүй");
    }
    setChangingPin(false);
  };

  /** Нэр солих */
  const changeName = async () => {
    const name = newName.trim();
    if (!name || !namePin) {
      toast.error("Бүх талбарыг бөглөнө үү");
      return;
    }
    setChangingName(true);
    try {
      const res = await fetch("/api/profile/username", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ newName: name, pin: namePin }),
      });
      const data = await res.json();
      if (res.ok) {
        // Login-той адил localStorage-д жижиг үсгээр хадгална
        localStorage.setItem("name", data.name.toLowerCase());
        toast.success("Нэр амжилттай солигдлоо!");
        // Sidebar, header зэрэг бүх газар шинэ нэрийг уншуулахын тулд дахин ачаална
        window.location.reload();
        return;
      }
      toast.error(data.error || "Алдаа гарлаа");
    } catch {
      toast.error("Сервертэй холбогдож чадсангүй");
    }
    setChangingName(false);
  };

  /** PIN мартсан - 1-р шат */
  const forgotPinStep1 = async () => {
    if (!forgotPinName.trim()) {
      toast.error("Нэрээ оруулна уу");
      return;
    }
    setForgotPinLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-pin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ step: 1, name: forgotPinName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setForgotPinStep(2);
      } else {
        toast.error(data.error || "Алдаа");
      }
    } catch {
      toast.error("Сервертэй холбогдож чадсангүй");
    }
    setForgotPinLoading(false);
  };

  /** PIN мартсан - 2-р шат */
  const forgotPinStep2 = async () => {
    if (!forgotPinNew || !forgotPinConfirm) {
      toast.error("Бүх талбарыг бөглөнө үү");
      return;
    }
    if (forgotPinNew !== forgotPinConfirm) {
      toast.error("PIN таарахгүй байна");
      return;
    }
    setForgotPinLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-pin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ step: 2, name: forgotPinName.trim(), newPin: forgotPinNew }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("PIN амжилттай сэргээгдлээ!");
        setShowForgotPinModal(false);
        setForgotPinStep(1);
        setForgotPinName("");
        setForgotPinNew("");
        setForgotPinConfirm("");
      } else {
        toast.error(data.error || "Алдаа");
      }
    } catch {
      toast.error("Сервертэй холбогдож чадсангүй");
    }
    setForgotPinLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface text-on-surface font-sans">
        <AppHeader title="Профайл" showProfile={false} />
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          {/* Avatar skeleton */}
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-5 w-32 rounded-lg" />
            <Skeleton className="h-3 w-40 rounded-lg" />
          </div>
          {/* Personal info skeleton */}
          <div className="bg-surface-elevated border border-border rounded-2xl p-4 space-y-4">
            <Skeleton className="h-3 w-24 rounded-lg" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          {/* Bio skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-16 rounded-lg" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
          {/* Instagram skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-20 rounded-lg" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          {/* Button skeleton */}
          <Skeleton className="h-12 w-full rounded-2xl" />
          {/* Stats skeleton */}
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const pct =
    profile.totalTodos > 0
      ? Math.round((profile.completedTodos / profile.totalTodos) * 100)
      : 0;
  const age = getAge(profile.birthDate);
  const isBday = isBirthdayToday(profile.birthDate);

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      {/* Баярын цаас */}
      {showBirthday && <Confetti />}

      <AppHeader title="Профайл" showProfile={false} />

      <div className="max-w-5xl mx-auto px-4 py-6 lg:py-10">
        <div className="lg:grid lg:grid-cols-12 lg:gap-6">
        {/* ── Зүүн тал (desktop): профайнлын карт ── */}
        <div className="lg:col-span-4 lg:sticky lg:top-20 lg:self-start space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div
              className={`w-24 h-24 rounded-full bg-surface-elevated border-2 overflow-hidden shadow-2xl transition-all duration-500 ${
                isBday ? "border-pink-500 shadow-pink-500/30" : "border-border"
              }`}
            >
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-black text-accent/40">
                  {profile.name[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
            >
              {uploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Camera size={14} />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) =>
                e.target.files?.[0] && uploadAvatar(e.target.files[0])
              }
            />
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl font-black">
                {profile.fullName || profile.name}
              </h2>
              {isBday && (
                <span className="text-xl animate-bounce">🎂</span>
              )}
            </div>
            {profile.instagram && (
              <a
                href={`https://instagram.com/${profile.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1 text-xs text-pink-400 hover:text-pink-300 transition-colors"
              >
                <Instagram size={12} /> @{profile.instagram}
              </a>
            )}
            <p className="text-[10px] text-on-surface-muted mt-1">
              {new Date(profile.createdAt).toLocaleDateString("mn-MN")}-с
              бүртгэлтэй
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-elevated border border-border-subtle rounded-2xl p-4 text-center">
            <p className="text-2xl font-black">{profile.completedTodos}</p>
            <p className="text-[10px] text-on-surface-muted mt-1">
              Биелсэн todo
            </p>
          </div>
          <div className="bg-surface-elevated border border-border-subtle rounded-2xl p-4 text-center">
            <p className="text-2xl font-black">{pct}%</p>
            <p className="text-[10px] text-on-surface-muted mt-1">
              Гүйцэтгэл
            </p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[10px] text-on-surface-muted mb-1">
            <span>Todo progress</span>
            <span>
              {profile.completedTodos}/{profile.totalTodos}
            </span>
          </div>
          <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        </div>{/* /зүүн тал */}

        {/* ── Баруун тал (desktop): форм + аюулгүй байдал ── */}
        <div className="lg:col-span-8 mt-6 lg:mt-0 space-y-6">

        {/* Төрсөн өдрийн мэнд хүргэх хэсэг */}
        {isBday && (
          <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-2xl p-4 text-center animate-pulse">
            <div className="flex items-center justify-center gap-2 mb-2">
              <PartyPopper size={20} className="text-pink-400" />
              <span className="text-sm font-bold text-pink-400">
                Төрсөн өдрийн мэнд хүргэе!
              </span>
              <PartyPopper size={20} className="text-pink-400" />
            </div>
            {age !== null && (
              <p className="text-xs text-on-surface-muted">
                Таны нас: {age} настай 🎉
              </p>
            )}
          </div>
        )}

        {/* ── Хувийн мэдээлэл ── */}
        <div className="bg-surface-elevated border border-border rounded-2xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <h3 className="text-[10px] font-black text-on-surface-muted uppercase tracking-widest sm:col-span-2">
            Хувийн мэдээлэл
          </h3>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider flex items-center gap-1">
              <User size={10} /> Бүтэн нэр
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={100}
              placeholder="Бүтэн нэрээ оруулна уу"
              className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-muted/50 outline-none focus:ring-2 focus:ring-accent/30 transition-all"
            />
          </div>

          {/* Gmail */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider flex items-center gap-1">
              <Mail size={10} /> Gmail
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              maxLength={100}
              placeholder="example@gmail.com"
              className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-muted/50 outline-none focus:ring-2 focus:ring-accent/30 transition-all"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider flex items-center gap-1">
              <Phone size={10} /> Утасны дугаар
            </label>
            <input
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value.replace(/[^0-9+\-\s()]/g, ""))
              }
              maxLength={20}
              placeholder="+976 xxxxxxxx"
              className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-muted/50 outline-none focus:ring-2 focus:ring-accent/30 transition-all"
            />
          </div>

          {/* Birth Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider flex items-center gap-1">
              <CalendarDays size={10} /> Төрсөн өдөр
            </label>
            <input
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              type="date"
              className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-accent/30 transition-all"
            />
            {age !== null && (
              <p className="text-[10px] text-on-surface-muted">
                Нас: {age} настай
              </p>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider">
            Тухай
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="Өөрийнхөө тухай бичээрэй..."
            className="w-full bg-surface-elevated border border-border rounded-2xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-muted/50 outline-none focus:ring-2 focus:ring-accent/30 transition-all resize-none"
          />
          <span className="text-[10px] text-on-surface-muted">
            {bio.length}/200
          </span>
        </div>

        {/* Instagram */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider flex items-center gap-1">
            <Instagram size={10} /> Instagram
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-on-surface-muted">@</span>
            <input
              value={ig}
              onChange={(e) =>
                setIg(e.target.value.replace(/[^a-zA-Z0-9._]/g, ""))
              }
              maxLength={30}
              placeholder="username"
              className="flex-1 bg-surface-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-muted/50 outline-none focus:ring-2 focus:ring-accent/30 transition-all"
            />
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={saveProfile}
          disabled={saving}
          className="w-full py-3 rounded-2xl bg-accent/20 border border-accent/30 text-accent text-sm font-bold
            hover:bg-accent/30 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          Хадгалах
        </button>

        {/* ── Аюулгүй байдал ── */}
        <div className="bg-surface-elevated border border-border rounded-2xl p-4 space-y-3">
          <h3 className="text-[10px] font-black text-on-surface-muted uppercase tracking-widest flex items-center gap-1">
            <Lock size={10} /> Аюулгүй байдал
          </h3>
          <button
            onClick={() => {
              setNewName(profile?.name ?? "");
              setNamePin("");
              setShowNameModal(true);
            }}
            className="w-full py-2.5 rounded-xl bg-surface border border-border text-sm font-semibold text-on-surface
              hover:bg-card-hover hover:border-accent/30 transition-all flex items-center justify-center gap-2"
          >
            <AtSign size={14} /> Нэр солих
          </button>
          <button
            onClick={() => setShowPinModal(true)}
            className="w-full py-2.5 rounded-xl bg-surface border border-border text-sm font-semibold text-on-surface
              hover:bg-card-hover hover:border-accent/30 transition-all flex items-center justify-center gap-2"
          >
            <KeyRound size={14} /> PIN солих
          </button>
          <button
            onClick={() => setShowForgotPinModal(true)}
            className="w-full py-2.5 rounded-xl bg-surface border border-border text-sm font-semibold text-on-surface-muted
              hover:bg-card-hover hover:text-on-surface hover:border-accent/30 transition-all flex items-center justify-center gap-2"
          >
            PIN мартсан? Сэргээх
          </button>
        </div>

        {/* ── Нэр солих модал ── */}
        {showNameModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-surface-elevated border border-border rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <AtSign size={16} className="text-accent" /> Нэр солих
                </h3>
                <button onClick={() => setShowNameModal(false)} className="p-1 hover:bg-card-hover rounded-lg transition-all">
                  <X size={16} />
                </button>
              </div>
              <p className="text-[11px] text-on-surface-muted leading-relaxed">
                Дараа нэвтрэхдээ шинэ нэрээ ашиглана. Таны пост, чат, todo бүгд шинэ нэр рүү шилжинэ.
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider">
                    Шинэ нэр
                  </label>
                  <input
                    value={newName}
                    maxLength={30}
                    autoCapitalize="none"
                    autoCorrect="off"
                    onChange={(e) => setNewName(e.target.value.replace(/\s/g, ""))}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-accent/30 transition-all"
                  />
                  <p className="text-[10px] text-on-surface-muted/70">2-30 тэмдэгт: үсэг, тоо, _ . -</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider">
                    PIN (баталгаажуулах)
                  </label>
                  <input
                    value={namePin}
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••"
                    onChange={(e) => setNamePin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => e.key === "Enter" && changeName()}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-on-surface tracking-[0.3em] outline-none focus:ring-2 focus:ring-accent/30 transition-all"
                  />
                </div>
              </div>
              <button
                onClick={changeName}
                disabled={changingName || !newName.trim() || newName.trim() === profile?.name || !namePin}
                className="w-full py-3 rounded-2xl bg-accent/20 border border-accent/30 text-accent text-sm font-bold
                  hover:bg-accent/30 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              >
                {changingName ? <Loader2 size={14} className="animate-spin" /> : <AtSign size={14} />}
                Нэр солих
              </button>
            </div>
          </div>
        )}

        {/* ── PIN солих модал ── */}
        {showPinModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-surface-elevated border border-border rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <KeyRound size={16} className="text-accent" /> PIN солих
                </h3>
                <button onClick={() => setShowPinModal(false)} className="p-1 hover:bg-card-hover rounded-lg transition-all">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider">
                    Одоогийн PIN
                  </label>
                  <input
                    value={currentPin}
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••"
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-on-surface tracking-[0.3em] outline-none focus:ring-2 focus:ring-accent/30 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider">
                    Шинэ PIN
                  </label>
                  <input
                    value={newPin}
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••"
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-on-surface tracking-[0.3em] outline-none focus:ring-2 focus:ring-accent/30 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider">
                    PIN Давтах
                  </label>
                  <input
                    value={confirmNewPin}
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••"
                    onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className={`w-full bg-surface border rounded-xl px-3 py-2.5 text-sm text-on-surface tracking-[0.3em] outline-none transition-all
                      ${confirmNewPin && newPin && confirmNewPin !== newPin ? "border-red-500/40" : confirmNewPin && newPin && confirmNewPin === newPin ? "border-emerald-500/40" : "border-border focus:ring-2 focus:ring-accent/30"}`}
                  />
                </div>
              </div>
              <button
                onClick={changePin}
                disabled={changingPin || !currentPin || !newPin || !confirmNewPin}
                className="w-full py-3 rounded-2xl bg-accent/20 border border-accent/30 text-accent text-sm font-bold
                  hover:bg-accent/30 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              >
                {changingPin ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                PIN солих
              </button>
            </div>
          </div>
        )}

        {/* ── PIN мартсан модал ── */}
        {showForgotPinModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-surface-elevated border border-border rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
              <div className="flex items-center justify-center">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Lock size={16} className="text-accent" /> PIN сэргээх
                </h3>
              </div>

              {forgotPinStep === 1 ? (
                <div className="space-y-3">
                  <p className="text-xs text-on-surface-muted text-center">
                    Нэрээ оруулж шалгана уу
                  </p>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider">
                      Таны нэр
                    </label>
                    <input
                      value={forgotPinName}
                      placeholder="Нэрээ оруулна уу"
                      onChange={(e) => setForgotPinName(e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-accent/30 transition-all"
                    />
                  </div>
                  <button
                    onClick={forgotPinStep1}
                    disabled={forgotPinLoading || !forgotPinName.trim()}
                    className="w-full py-3 rounded-2xl bg-accent/20 border border-accent/30 text-accent text-sm font-bold
                      hover:bg-accent/30 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                  >
                    {forgotPinLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                    Үргэлжлүүлэх
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-on-surface-muted text-center">
                    Шинэ PIN-ийг оруулна уу
                  </p>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider">
                      Шинэ PIN
                    </label>
                    <input
                      value={forgotPinNew}
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="••••"
                      onChange={(e) => setForgotPinNew(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-on-surface tracking-[0.3em] outline-none focus:ring-2 focus:ring-accent/30 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider">
                      PIN Давтах
                    </label>
                    <input
                      value={forgotPinConfirm}
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="••••"
                      onChange={(e) => setForgotPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className={`w-full bg-surface border rounded-xl px-3 py-2.5 text-sm text-on-surface tracking-[0.3em] outline-none transition-all
                        ${forgotPinConfirm && forgotPinNew && forgotPinConfirm !== forgotPinNew ? "border-red-500/40" : forgotPinConfirm && forgotPinNew && forgotPinConfirm === forgotPinNew ? "border-emerald-500/40" : "border-border focus:ring-2 focus:ring-accent/30"}`}
                    />
                  </div>
                  <button
                    onClick={forgotPinStep2}
                    disabled={forgotPinLoading || !forgotPinNew || !forgotPinConfirm}
                    className="w-full py-3 rounded-2xl bg-accent/20 border border-accent/30 text-accent text-sm font-bold
                      hover:bg-accent/30 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                  >
                    {forgotPinLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                    PIN сэргээх
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  setShowForgotPinModal(false);
                  setForgotPinStep(1);
                  setForgotPinName("");
                  setForgotPinNew("");
                  setForgotPinConfirm("");
                }}
                className="w-full text-xs text-on-surface-muted hover:text-on-surface text-center transition-colors"
              >
                Цуцлах
              </button>
            </div>
          </div>
        )}
        </div>{/* /баруун тал */}
        </div>{/* /grid */}
      </div>
    </div>
  );
}
