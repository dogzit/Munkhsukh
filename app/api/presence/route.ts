import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * POST /api/presence — "би сайтад байна" (lastSeen шинэчилнэ)
 * Хариуд нь шууд харуулах X O попапууд: надад ирсэн дуудлага, миний дуудлагыг зөвшөөрсөн тулаан
 */
export async function POST(req: Request) {
  try {
    const me = req.headers.get("x-user-name");
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await prisma.user.updateMany({ where: { name: me }, data: { lastSeen: new Date() } });

    const games = await prisma.xoGame.findMany({
      where: {
        OR: [
          { status: "PENDING", opponent: me },
          // Дөнгөж зөвшөөрөгдсөн, анхны нүүдэл хийгдээгүй миний дуудлага
          { status: "ACTIVE", challenger: me, turn: me, board: "........." },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    const others = [...new Set(games.map((g) => (g.challenger === me ? g.opponent : g.challenger)))];
    const users = await prisma.user.findMany({
      where: { name: { in: others } },
      select: { name: true, fullName: true, avatar: true },
    });
    const alerts = games.map((g) => {
      const other = g.challenger === me ? g.opponent : g.challenger;
      const u = users.find((x) => x.name === other);
      return {
        id: g.id,
        kind: g.status === "PENDING" ? ("invite" as const) : ("accepted" as const),
        name: u?.fullName || other,
        avatar: u?.avatar ?? null,
      };
    });
    return NextResponse.json({ alerts });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
