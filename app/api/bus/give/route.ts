import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateQrToken } from "@/lib/qr";
import { getAppUrlFromRequest, sendBookingEmail } from "@/lib/busEmail";
import { sendMail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const fromUserName = req.headers.get("x-user-name");
    if (!fromUserName) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const toUserNameRaw = (body as { toUserName?: unknown } | null)?.toUserName;
    if (!toUserNameRaw || typeof toUserNameRaw !== "string") {
      return NextResponse.json(
        { error: "Хүлээн авагчийн нэр шаардлагатай" },
        { status: 400 },
      );
    }
    const toUserName = toUserNameRaw.trim();
    if (toUserName.toLowerCase() === fromUserName.toLowerCase()) {
      return NextResponse.json(
        { error: "Өөртөө шилжүүлэх боломжгүй" },
        { status: 400 },
      );
    }

    const myBooking = await prisma.busBooking.findFirst({
      where: { userName: fromUserName },
      orderBy: { createdAt: "desc" },
    });
    if (!myBooking) {
      return NextResponse.json(
        { error: "Танд захиалга алга" },
        { status: 404 },
      );
    }
    if (myBooking.status === "BOARDED" || myBooking.boardedAt) {
      return NextResponse.json(
        { error: "Суусны дараа шилжүүлэх боломжгүй" },
        { status: 409 },
      );
    }

    const recipient = await prisma.user.findUnique({
      where: { name: toUserName },
      select: { name: true, email: true },
    });
    if (!recipient) {
      return NextResponse.json(
        { error: "Тийм нэртэй хэрэглэгч олдсонгүй" },
        { status: 404 },
      );
    }
    if (!recipient.email) {
      return NextResponse.json(
        { error: "Хүлээн авагч email бүртгээгүй байна" },
        { status: 400 },
      );
    }

    const existing = await prisma.busBooking.findFirst({
      where: { userName: recipient.name },
    });
    if (existing) {
      return NextResponse.json(
        {
          error:
            "Хүлээн авагч аль хэдийн суудалтай. Тэр эхлээд захиалгаа цуцлах хэрэгтэй.",
        },
        { status: 409 },
      );
    }

    const newToken = generateQrToken();
    const status = myBooking.status === "PENDING" ? "PENDING" : "APPROVED";

    const updated = await prisma.busBooking.update({
      where: { id: myBooking.id },
      data: {
        userName: recipient.name,
        email: recipient.email,
        qrToken: newToken,
        status,
      },
    });

    const appUrl = getAppUrlFromRequest(req);

    // New owner: full booking email with fresh QR
    void sendBookingEmail({
      appUrl,
      to: recipient.email,
      seatId: updated.seatId,
      userName: updated.userName,
      qrToken: updated.qrToken,
      status: status as "APPROVED" | "PENDING",
    });

    // Old owner: notice their booking was transferred
    void sendMail({
      to: myBooking.email,
      subject: `11A Ангийн Апп — Захиалга шилжүүлэв (${updated.seatId})`,
      html: `<div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width:480px; margin:0 auto; padding:32px; background:#0a0a0f; color:#fff;">
          <h1 style="margin:0 0 8px 0; font-size:22px;">11A Ангийн Апп</h1>
          <p style="color:#a1a1aa; margin:0 0 20px 0;">Захиалга <b style="color:#fff;">${recipient.name}</b>-д шилжүүллээ.</p>
          <div style="background:#18181b; border:1px solid #27272a; border-radius:16px; padding:20px; text-align:center;">
            <p style="color:#71717a; text-transform:uppercase; font-size:11px; margin:0 0 8px 0; font-weight:700; letter-spacing:2px;">Суудал</p>
            <p style="font-size:36px; font-weight:900; margin:0;">${updated.seatId}</p>
          </div>
          <p style="color:#a1a1aa; font-size:12px; margin-top:16px;">Таны хуучин QR ажиллахгүй боллоо.</p>
        </div>`,
      text: `Захиалга ${recipient.name}-д шилжүүлэв. Суудал ${updated.seatId}.`,
    });

    return NextResponse.json({
      success: true,
      newOwner: recipient.name,
      seatId: updated.seatId,
    });
  } catch (e) {
    console.error("bus give error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
