"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  User as UserIcon,
  Lock,
  Mail,
  Shield,
  Phone,
  Cake,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";

type Step = "name" | "pin" | "fullName" | "email" | "otp" | "phone" | "birth" | "done";
const ORDER: Step[] = ["name", "pin", "fullName", "email", "otp", "phone", "birth", "done"];

function isValidPin(p: string) {
  return /^\d{4}$/.test(p) || /^\d{6}$/.test(p);
}
function digitsOnly(v: string, max = 6) {
  return v.replace(/\D/g, "").slice(0, max);
}
function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [checking, setChecking] = useState(true);

  // form state
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useLayoutEffect(() => {
    const storedName = localStorage.getItem("name");
    if (storedName) {
      router.replace(
        localStorage.getItem("role") === "ADMIN" ||
          storedName.toLowerCase() === "admin"
          ? "/admin"
          : "/",
      );
    } else {
      setChecking(false);
    }
  }, [router]);

  const stepIdx = ORDER.indexOf(step);
  const progress = useMemo(
    () => Math.round((stepIdx / (ORDER.length - 1)) * 100),
    [stepIdx],
  );

  const next = (s: Step) => setStep(s);
  const back = () => {
    const idx = ORDER.indexOf(step);
    if (idx > 0) setStep(ORDER[idx - 1]);
  };

  const sendOtp = async (target: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup/send-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: target }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Email илгээхэд алдаа");
        return false;
      }
      setResendCooldown(45);
      if (data.dev) {
        toast.info("Dev режим: OTP кодыг console-с харна уу");
      } else {
        toast.success("Баталгаажуулах код таны email-д илгээгдэв");
      }
      return true;
    } catch {
      toast.error("Сүлжээний алдаа");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // handlers per step
  const handleName = () => {
    if (!name.trim()) return toast.error("Нэрээ оруулна уу");
    if (name.trim().length < 2) return toast.error("Нэр 2-оос дээш үсэгтэй байх ёстой");
    next("pin");
  };

  const handlePin = () => {
    if (!isValidPin(pin)) return toast.error("PIN 4 эсвэл 6 оронтой байх ёстой");
    if (pin !== pinConfirm) return toast.error("PIN давталт таарахгүй байна");
    next("fullName");
  };

  const handleFullName = () => {
    if (!fullName.trim()) return toast.error("Бүтэн нэр шаардлагатай");
    next("email");
  };

  const handleEmail = async () => {
    if (!isEmail(email)) return toast.error("Хүчинтэй email оруулна уу");
    const ok = await sendOtp(email.trim().toLowerCase());
    if (ok) next("otp");
  };

  const handleOtp = async () => {
    if (!/^\d{6}$/.test(otp.trim())) return toast.error("Код 6 оронтой байх ёстой");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Код буруу");
        return;
      }
      toast.success("Email баталгаажлаа ✨");
      next("phone");
    } catch {
      toast.error("Сүлжээний алдаа");
    } finally {
      setLoading(false);
    }
  };

  const finalize = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          number: pin,
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          birthDate: birthDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Бүртгэл амжилтгүй");
        return;
      }
      // Админ зөвшөөрөх хүртэл нэвтрэхгүй
      toast.success("Бүртгэл үүслээ! Админ зөвшөөрмөгц имэйлээр мэдэгдэнэ ✨", {
        duration: 8000,
      });
      router.push("/auth/login");
    } catch {
      toast.error("Сервертэй холбогдож чадсангүй");
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;

  return (
    <div className="min-h-screen bg-surface text-on-surface flex items-center justify-center p-6 font-sans">
      <div className="fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-emerald-600 rounded-full mix-blend-multiply filter blur-[160px] opacity-15 animate-pulse" />
        <div
          className="absolute bottom-0 -right-4 w-96 h-96 bg-cyan-600 rounded-full mix-blend-multiply filter blur-[160px] opacity-15 animate-pulse"
          style={{ animationDelay: "1.5s" }}
        />
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-surface-elevated border border-border mb-4 shadow-2xl">
            <span className="text-3xl">🎓</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight uppercase italic mb-1">
            Бүртгэл
          </h1>
          <p className="text-on-surface-muted text-xs">
            Алхам {stepIdx + 1} / {ORDER.length}
          </p>
        </div>

        {/* progress bar */}
        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="bg-surface-elevated border border-border backdrop-blur-xl rounded-3xl p-6 shadow-2xl">
          {step === "name" && (
            <StepCard
              icon={<UserIcon size={22} className="text-emerald-400" />}
              title="Хэрэглэгчийн нэр"
              hint="Энэ нь нэвтрэхэд ашиглагдана"
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="жишээ: bat_bold"
                autoFocus
                className={inputCls}
                onKeyDown={(e) => e.key === "Enter" && handleName()}
              />
              <PrimaryButton onClick={handleName} loading={loading}>
                Үргэлжлүүлэх
              </PrimaryButton>
            </StepCard>
          )}

          {step === "pin" && (
            <StepCard
              icon={<Lock size={22} className="text-emerald-400" />}
              title="PIN код"
              hint="4 эсвэл 6 оронтой тоо"
            >
              <input
                value={pin}
                type="password"
                inputMode="numeric"
                placeholder="••••"
                onChange={(e) => setPin(digitsOnly(e.target.value))}
                autoFocus
                maxLength={6}
                className={`${inputCls} tracking-[0.4em]`}
              />
              <input
                value={pinConfirm}
                type="password"
                inputMode="numeric"
                placeholder="PIN давтах"
                onChange={(e) => setPinConfirm(digitsOnly(e.target.value))}
                maxLength={6}
                className={`${inputCls} tracking-[0.4em]
                  ${pinConfirm && pin && pinConfirm !== pin ? "border-red-500/40" : pinConfirm && pin && pinConfirm === pin ? "border-emerald-500/40" : ""}`}
                onKeyDown={(e) => e.key === "Enter" && handlePin()}
              />
              <BackNext onBack={back} onNext={handlePin} loading={loading} />
            </StepCard>
          )}

          {step === "fullName" && (
            <StepCard
              icon={<UserIcon size={22} className="text-emerald-400" />}
              title="Бүтэн нэр"
              hint="Албан ёсны нэр, овог + нэр"
            >
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="жишээ: Батбаярын Бат-Эрдэнэ"
                autoFocus
                className={inputCls}
                onKeyDown={(e) => e.key === "Enter" && handleFullName()}
              />
              <BackNext onBack={back} onNext={handleFullName} loading={loading} />
            </StepCard>
          )}

          {step === "email" && (
            <StepCard
              icon={<Mail size={22} className="text-emerald-400" />}
              title="Email"
              hint="Баталгаажуулах кодыг илгээнэ. QR тасалбар энэ хаяг руу очно."
            >
              <input
                value={email}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                className={inputCls}
                onKeyDown={(e) => e.key === "Enter" && handleEmail()}
              />
              <BackNext onBack={back} onNext={handleEmail} loading={loading} nextLabel="Код илгээх" />
            </StepCard>
          )}

          {step === "otp" && (
            <StepCard
              icon={<Shield size={22} className="text-emerald-400" />}
              title="Код баталгаажуулах"
              hint={`${email} — spam хавтсаа шалгах хэрэгтэй байж болзошгүй`}
            >
              <input
                value={otp}
                onChange={(e) => setOtp(digitsOnly(e.target.value))}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                placeholder="••••••"
                className={`${inputCls} text-xl text-center tracking-[0.5em] font-mono`}
                onKeyDown={(e) => e.key === "Enter" && handleOtp()}
              />
              <button
                onClick={async () => {
                  if (resendCooldown > 0) return;
                  await sendOtp(email.trim().toLowerCase());
                }}
                disabled={loading || resendCooldown > 0}
                className="w-full text-[11px] text-zinc-400 hover:text-white transition disabled:opacity-40 py-1"
              >
                {resendCooldown > 0
                  ? `Дахин илгээх (${resendCooldown}с)`
                  : "Дахин илгээх"}
              </button>
              <BackNext onBack={back} onNext={handleOtp} loading={loading} nextLabel="Батлах" />
            </StepCard>
          )}

          {step === "phone" && (
            <StepCard
              icon={<Phone size={22} className="text-emerald-400" />}
              title="Утасны дугаар"
              hint="Заавал биш — алгасаж болно"
            >
              <input
                value={phone}
                type="tel"
                inputMode="tel"
                placeholder="99001122"
                onChange={(e) => setPhone(e.target.value)}
                autoFocus
                className={inputCls}
                onKeyDown={(e) => e.key === "Enter" && next("birth")}
              />
              <BackNext onBack={back} onNext={() => next("birth")} nextLabel="Үргэлжлүүлэх" />
            </StepCard>
          )}

          {step === "birth" && (
            <StepCard
              icon={<Cake size={22} className="text-emerald-400" />}
              title="Төрсөн өдөр"
              hint="Заавал биш"
            >
              <input
                value={birthDate}
                type="date"
                onChange={(e) => setBirthDate(e.target.value)}
                autoFocus
                className={inputCls}
              />
              <BackNext onBack={back} onNext={() => next("done")} nextLabel="Дүгнэлт" />
            </StepCard>
          )}

          {step === "done" && (
            <StepCard
              icon={<CheckCircle2 size={22} className="text-emerald-400" />}
              title="Бэлэн үү?"
              hint="Мэдээллээ шалгаад бүртгэлээ үүсгэнэ үү"
            >
              <SummaryRow label="Нэр" value={name} />
              <SummaryRow label="Бүтэн нэр" value={fullName} />
              <SummaryRow label="Email" value={email} />
              {phone && <SummaryRow label="Утас" value={phone} />}
              {birthDate && <SummaryRow label="Төрсөн өдөр" value={birthDate} />}
              <BackNext
                onBack={back}
                onNext={finalize}
                loading={loading}
                nextLabel="Бүртгэлээ үүсгэх"
              />
            </StepCard>
          )}
        </div>

        <button
          type="button"
          onClick={() => router.push("/auth/login")}
          className="w-full mt-5 text-xs font-bold text-gray-600 hover:text-on-surface-muted uppercase tracking-widest text-center"
        >
          Аль хэдийн бүртгэлтэй юу? Нэвтрэх
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-2xl bg-surface-elevated border border-border px-5 py-4 text-on-surface placeholder:text-on-surface-muted/50 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/30 transition-all";

function StepCard({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-black">{title}</h2>
          {hint && <p className="text-[11px] text-on-surface-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  loading,
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-4 font-black text-white uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
    >
      {loading && <Loader2 className="animate-spin" size={16} />}
      {children}
    </button>
  );
}

function BackNext({
  onBack,
  onNext,
  loading,
  nextLabel = "Үргэлжлүүлэх",
}: {
  onBack: () => void;
  onNext: () => void;
  loading?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex gap-3">
      <button
        onClick={onBack}
        disabled={loading}
        className="px-5 py-4 rounded-2xl bg-white/[0.04] border border-border text-on-surface-muted text-xs font-black uppercase tracking-widest hover:bg-white/[0.08] flex items-center gap-1"
      >
        <ChevronLeft size={14} /> Буцах
      </button>
      <button
        onClick={onNext}
        disabled={loading}
        className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-4 font-black text-white uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading && <Loader2 className="animate-spin" size={16} />}
        {nextLabel}
      </button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.02] border border-border rounded-xl p-3">
      <p className="text-[9px] uppercase tracking-widest text-on-surface-muted font-bold mb-0.5">
        {label}
      </p>
      <p className="text-sm text-on-surface font-medium">{value}</p>
    </div>
  );
}
