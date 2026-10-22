import prisma from "@/lib/prisma";
import { getMyRoles } from "@/lib/roles";
import { gamesClosedUntil } from "@/lib/games";
import { NextResponse } from "next/server";

/**
 * Тоглоом бүрийн оноо хадгалах GET/POST (2048, BLOCK!!! …).
 * bestTile — 2048-д хамгийн том хавтан, BLOCK!!!-д устгасан мөрийн тоо.
 */
export function gameScoreHandlers(GAME: string, canPlay: (role: string | undefined) => boolean) {
  /** GET — ангийн шилдэг 10 оноо + миний хамгийн сайн оноо */
  async function GET(req: Request) {
    try {
      const me = await getMyRoles(req);
      if (!canPlay(me?.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const userName = req.headers.get("x-user-name") ?? "";

      const [top, mine] = await Promise.all([
        prisma.gameScore.findMany({
          where: { game: GAME },
          orderBy: [{ best: "desc" }, { updatedAt: "asc" }],
          take: 10,
        }),
        prisma.gameScore.findUnique({ where: { game_userName: { game: GAME, userName } } }),
      ]);

      const users = await prisma.user.findMany({
        where: { name: { in: top.map((t) => t.userName) } },
        select: { name: true, fullName: true, avatar: true },
      });
      const byName = new Map(users.map((u) => [u.name, u]));

      return NextResponse.json({
        top: top.map((t) => ({
          userName: t.userName,
          fullName: byName.get(t.userName)?.fullName ?? null,
          avatar: byName.get(t.userName)?.avatar ?? null,
          best: t.best,
          bestTile: t.bestTile,
        })),
        myBest: mine?.best ?? 0,
        myBestTile: mine?.bestTile ?? 0,
      });
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  }

  /** POST { score, tile } — өмнөхөөсөө өндөр бол хадгална */
  async function POST(req: Request) {
    try {
      const me = await getMyRoles(req);
      if (!canPlay(me?.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (gamesClosedUntil() && me?.role !== "ADMIN") {
        return NextResponse.json({ error: "Админы зүгээс хаасан байна" }, { status: 403 });
      }
      const userName = req.headers.get("x-user-name") ?? "";

      const body = (await req.json().catch(() => null)) as { score?: unknown; tile?: unknown } | null;
      const score = body?.score;
      const tile = body?.tile;
      if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > 100_000_000) {
        return NextResponse.json({ error: "invalid score" }, { status: 400 });
      }
      const bestTile =
        typeof tile === "number" && Number.isInteger(tile) && tile > 0 && tile <= 1 << 20 ? tile : 0;

      const prev = await prisma.gameScore.findUnique({
        where: { game_userName: { game: GAME, userName } },
      });
      // Оноо эсвэл хамгийн том хавтан ахисан үед л шинэчилнэ
      if (prev && prev.best >= score && prev.bestTile >= bestTile) {
        return NextResponse.json({ best: prev.best, updated: false });
      }

      const saved = await prisma.gameScore.upsert({
        where: { game_userName: { game: GAME, userName } },
        create: { game: GAME, userName, best: score, bestTile },
        update: {
          best: Math.max(score, prev?.best ?? 0),
          bestTile: Math.max(bestTile, prev?.bestTile ?? 0),
        },
      });
      return NextResponse.json({ best: saved.best, updated: true });
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  }

  return { GET, POST };
}
