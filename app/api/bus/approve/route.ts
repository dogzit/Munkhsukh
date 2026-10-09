import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminFromHeaders } from "@/lib/requireAuth";
import { busApprovedTemplate, notifyUserByEmail } from "@/lib/notify";
import { pushToUser } from "@/lib/push";

function getAppUrl(req: NextRequest): string {
  const explicit = process.env.APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminFromHeaders(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { seatId, status } = await req.json();

    if (!seatId || !status) {
      return NextResponse.json(
        { error: "Мэдээлэл дутуу байна (seatId эсвэл status)" },
        { status: 400 },
      );
    }

    if (status === "APPROVED") {
      const updated = await prisma.busBooking.update({
        where: { seatId },
        data: { status: "APPROVED" },
      });

      const appUrl = getAppUrl(req);
      const ticketUrl = `${appUrl}/bus/ticket/${encodeURIComponent(updated.qrToken)}`;
      const tpl = busApprovedTemplate({ seatId: updated.seatId, ticketUrl });
      void notifyUserByEmail(updated.userName, tpl);
      after(() =>
        pushToUser(updated.userName, {
          title: "🚌 VIP хүсэлт батлагдлаа",
          body: `Таны суудал: ${updated.seatId}. Тасалбараа нээх бол дарна уу.`,
          href: `/bus/ticket/${encodeURIComponent(updated.qrToken)}`,
        }),
      );

      return NextResponse.json({
        success: true,
        message: "Захиалга баталгаажлаа",
      });
    }

    if (status === "REJECTED") {
      await prisma.busBooking.delete({
        where: { seatId },
      });
      return NextResponse.json({
        success: true,
        message: "Захиалга цуцлагдлаа",
      });
    }

    return NextResponse.json({ error: "Буруу статус" }, { status: 400 });
  } catch (error) {
    console.error("Approve API Error:", error);
    return NextResponse.json(
      {
        error:
          "Сервер дээр алдаа гарлаа. Магадгүй энэ суудалд захиалга байхгүй байна.",
      },
      { status: 500 },
    );
  }
}
