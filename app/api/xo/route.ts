import prisma from "@/lib/prisma";
import { getMyRoles } from "@/lib/roles";
import { canStartXo } from "@/lib/games";
import { displayName, xoNotify } from "@/lib/xoNotify";
import { NextResponse, after } from "next/server";

/** GET — миний тулаанууд (дуудлага, идэвхтэй, сүүлийн дууссан) + амжилт */
export async function GET(req: Request) {
  try {
    const me = req.headers.get("x-user-name");
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const games = await prisma.xoGame.findMany({
      where: { OR: [{ challenger: me }, { opponent: me }] },
      orderBy: { updatedAt: "desc" },
      take: 40,
    });
    const done = await prisma.xoGame.findMany({
      where: { status: "DONE", OR: [{ challenger: me }, { opponent: me }] },
      select: { winner: true },
    });
    const stats = {
      win: done.filter((g) => g.winner === me).length,
      draw: done.filter((g) => g.winner === "DRAW").length,
      loss: done.filter((g) => g.winner && g.winner !== me && g.winner !== "DRAW").length,
    };

    const names = [...new Set(games.flatMap((g) => [g.challenger, g.opponent]))];
    const users = await prisma.user.findMany({
      where: { name: { in: names } },
      select: { name: true, fullName: true, avatar: true },
    });

    const roles = await getMyRoles(req);
    return NextResponse.json({ me, games, stats, users, canStart: canStartXo(roles?.role, me) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** POST { opponent } — тулаанд дуудах */
export async function POST(req: Request) {
  try {
    const me = req.headers.get("x-user-name");
    const roles = await getMyRoles(req);
    if (!me || !canStartXo(roles?.role, me)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = (await req.json().catch(() => null)) as { opponent?: unknown } | null;
    const opponent = typeof body?.opponent === "string" ? body.opponent.trim() : "";
    if (!opponent || opponent === me) {
      return NextResponse.json({ error: "Өрсөлдөгчөө сонгоно уу" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { name: opponent }, select: { status: true } });
    if (!user || user.status !== "APPROVED") {
      return NextResponse.json({ error: "Хэрэглэгч олдсонгүй" }, { status: 404 });
    }
    // Хоёр хүний хооронд нэг л нээлттэй тулаан
    const open = await prisma.xoGame.findFirst({
      where: {
        status: { in: ["PENDING", "ACTIVE"] },
        OR: [
          { challenger: me, opponent },
          { challenger: opponent, opponent: me },
        ],
      },
    });
    if (open) return NextResponse.json({ error: "Та хоёрын тулаан аль хэдийн байна", id: open.id }, { status: 409 });

    const game = await prisma.xoGame.create({ data: { challenger: me, opponent } });
    after(async () => {
      const name = await displayName(me);
      await xoNotify(opponent, game.id, "⚔️ X O тулаанд дуудлаа!", `${name} чамайг тулаанд дуудаж байна. Зөвшөөрөх үү?`);
    });
    return NextResponse.json(game, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
