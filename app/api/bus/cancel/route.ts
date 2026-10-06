import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminFromHeaders } from "@/lib/requireAuth";
import { sendMail } from "@/lib/mailer";

function cancelledEmailTemplate(args: {
  seatId: string;
  byAdmin: boolean;
}) {
  const subject = args.byAdmin
    ? `11A Ангийн Апп — Захиалга цуцлагдлаа (${args.seatId})`
    : `11A Ангийн Апп — Захиалга цуцлагдлаа (${args.seatId})`;
  const reason = args.byAdmin
    ? "Таны захиалгыг админ цуцалсан байна."
    : "Таны захиалгыг өөрөө цуцаллаа.";
  const text = `${subject}\n\nСуудал: ${args.seatId}\n${reason}\nQR код одоо ажиллахгүй.`;
  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #fff;">
      <h1 style="margin:0 0 8px 0; font-size:22px;">11A Ангийн Апп</h1>
      <p style="color:#a1a1aa; margin:0 0 24px 0;">Захиалга цуцлагдлаа</p>
      <div style="background:#18181b; border:1px solid #27272a; border-radius:16px; padding:20px; text-align:center;">
        <p style="color:#71717a; text-transform:uppercase; letter-spacing:2px; font-size:11px; margin:0 0 8px 0; font-weight:700;">Суудал</p>
        <p style="font-size:36px; font-weight:900; margin:0 0 12px 0;">${args.seatId}</p>
        <p style="color:#a1a1aa; font-size:12px; margin:0;">${reason}</p>
      </div>
      <p style="color:#a1a1aa; font-size:13px; margin-top:20px; text-align:center;">Өмнөх QR ажиллахгүй боллоо.</p>
    </div>`;
  return { subject, html, text };
}

export async function POST(req: NextRequest) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { seatId } = await req.json();
    if (!seatId || typeof seatId !== "string") {
      return NextResponse.json(
        { error: "seatId шаардлагатай" },
        { status: 400 },
      );
    }

    const booking = await prisma.busBooking.findUnique({
      where: { seatId },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Захиалга олдсонгүй" },
        { status: 404 },
      );
    }

    const isOwner = booking.userName === userName;
    const isAdmin = isAdminFromHeaders(req);
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Бусдын захиалгыг цуцлах боломжгүй" },
        { status: 403 },
      );
    }

    await prisma.busBooking.delete({
      where: { seatId },
    });

    if (booking.email) {
      const tpl = cancelledEmailTemplate({
        seatId: booking.seatId,
        byAdmin: !isOwner && isAdmin,
      });
      void sendMail({ to: booking.email, ...tpl });
    }

    return NextResponse.json({ success: true, message: "Захиалга цуцлагдлаа" });
  } catch (error) {
    console.error("Bus cancel error:", error);
    return NextResponse.json(
      { error: "Сервер дээр алдаа гарлаа" },
      { status: 500 },
    );
  }
}
