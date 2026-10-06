import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const booking = await prisma.busBooking.findUnique({
    where: { qrToken: token },
    include: {
      user: {
        select: { name: true, fullName: true, avatar: true },
      },
    },
  });

  if (!booking) notFound();

  const qrSrc = `/api/qr/${encodeURIComponent(token)}`;
  const isBoarded = booking.status === "BOARDED";
  const isPending = booking.status === "PENDING";

  const created = booking.createdAt
    ? new Date(booking.createdAt).toLocaleString("mn-MN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 text-white relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[140px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-violet-600/10 rounded-full blur-[140px]" />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-2">
            11A Ангийн Апп
          </p>
          <h1 className="text-3xl font-black italic tracking-tighter">TICKET</h1>
        </div>

        {/* Ticket body */}
        <div
          className={`rounded-[32px] overflow-hidden border shadow-2xl relative
            ${
              isBoarded
                ? "border-emerald-500/30 bg-gradient-to-br from-emerald-950/60 via-zinc-900 to-teal-950/60"
                : isPending
                  ? "border-orange-500/30 bg-gradient-to-br from-orange-950/60 via-zinc-900 to-amber-950/60"
                  : "border-blue-500/30 bg-gradient-to-br from-blue-950/60 via-zinc-900 to-indigo-950/60"
            }`}
        >
          {/* Perforated edges (side notches) */}
          <div className="absolute left-0 top-[38%] -translate-y-1/2 w-4 h-8 bg-[#0a0a0f] rounded-r-full" />
          <div className="absolute right-0 top-[38%] -translate-y-1/2 w-4 h-8 bg-[#0a0a0f] rounded-l-full" />

          {/* Header — seat number */}
          <div className="px-6 pt-8 pb-6 text-center">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1">
              Суудал
            </p>
            <p className="text-6xl font-black tracking-tighter leading-none">
              {booking.seatId}
            </p>

            {isBoarded && (
              <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                  Суусан ✓
                </span>
              </div>
            )}
            {isPending && (
              <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-300">
                  VIP хүсэлт (батлагдаагүй)
                </span>
              </div>
            )}
          </div>

          {/* Dashed separator */}
          <div className="mx-6 border-t-2 border-dashed border-white/10" />

          {/* QR */}
          <div className="px-6 py-6">
            <div className="bg-white rounded-2xl p-4 shadow-lg flex items-center justify-center">
              <Image
                src={qrSrc}
                width={320}
                height={320}
                alt={`QR ${booking.seatId}`}
                className="w-full h-auto"
                unoptimized
                priority
              />
            </div>
            <p className="text-center text-[10px] text-zinc-500 mt-3 leading-relaxed">
              Автобусанд суух үедээ энэ QR-ыг админд үзүүлнэ үү
            </p>
          </div>

          {/* Details */}
          <div className="px-6 pb-6 space-y-2">
            <Row label="Захиалагч" value={booking.user.fullName || booking.userName} />
            <Row label="Email" value={booking.email} mono />
            {created && <Row label="Захиалсан" value={created} mono />}
            {booking.boardedAt && (
              <Row
                label="Суусан цаг"
                value={new Date(booking.boardedAt).toLocaleString("mn-MN")}
                mono
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a
            href={qrSrc}
            download={`bus-qr-${booking.seatId}.png`}
            className="py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-black uppercase tracking-widest hover:bg-zinc-800 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            ⬇ QR татах
          </a>
          <a
            href="/bus"
            className="py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-black uppercase tracking-widest hover:bg-zinc-800 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            🚌 Автобус
          </a>
        </div>

        <p className="text-center text-[10px] text-zinc-600 mt-4">
          Токен: <span className="font-mono">{token.slice(0, 8)}...{token.slice(-4)}</span>
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold shrink-0">
        {label}
      </span>
      <span
        className={`text-xs text-white text-right truncate ${mono ? "font-mono" : "font-medium"}`}
      >
        {value}
      </span>
    </div>
  );
}
