import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

export async function POST(req: NextRequest) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const qrToken = (body as { qrToken?: unknown }).qrToken;
    const confirm = (body as { confirm?: unknown }).confirm === true;

    if (!qrToken || typeof qrToken !== "string") {
      return NextResponse.json(
        { error: "QR токен шаардлагатай" },
        { status: 400 },
      );
    }

    const booking = await prisma.busBooking.findUnique({
      where: { qrToken },
      include: {
        user: {
          select: {
            name: true,
            fullName: true,
            avatar: true,
            phone: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "INVALID_QR", message: "Хүчинтэй QR олдсонгүй" },
        { status: 404 },
      );
    }

    if (booking.status === "PENDING") {
      return NextResponse.json(
        {
          error: "PENDING",
          message: "Энэ захиалга батлагдаагүй байна (VIP хүсэлт)",
          booking: {
            seatId: booking.seatId,
            userName: booking.userName,
            status: booking.status,
            user: booking.user,
          },
        },
        { status: 409 },
      );
    }

    if (booking.boardedAt) {
      return NextResponse.json({
        alreadyBoarded: true,
        booking: {
          seatId: booking.seatId,
          userName: booking.userName,
          status: booking.status,
          email: booking.email,
          boardedAt: booking.boardedAt,
          boardedBy: booking.boardedBy,
          user: booking.user,
        },
      });
    }

    if (!confirm) {
      return NextResponse.json({
        preview: true,
        booking: {
          seatId: booking.seatId,
          userName: booking.userName,
          status: booking.status,
          email: booking.email,
          user: booking.user,
        },
      });
    }

    const updated = await prisma.busBooking.update({
      where: { qrToken },
      data: {
        boardedAt: new Date(),
        boardedBy: userName,
        status: "BOARDED",
      },
      include: {
        user: {
          select: {
            name: true,
            fullName: true,
            avatar: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json({
      confirmed: true,
      booking: {
        seatId: updated.seatId,
        userName: updated.userName,
        status: updated.status,
        email: updated.email,
        boardedAt: updated.boardedAt,
        user: updated.user,
      },
    });
  } catch (e) {
    console.error("verify-qr error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
