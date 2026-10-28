import prisma from "@/lib/prisma";
import { getMyRoles } from "@/lib/roles";
import { NextResponse } from "next/server";

/** GET — X O тулаануудаас бүх сурагчдын ялалт/тэнцэл/хожигдлын жагсаалт (одоохондоо зөвхөн админ) */
export async function GET(req: Request) {
  try {
    const roles = await getMyRoles(req);
    if (roles?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const done = await prisma.xoGame.findMany({
      where: { status: "DONE" },
      select: { challenger: true, opponent: true, winner: true },
    });

    const stat = new Map<string, { win: number; draw: number; loss: number }>();
    const bump = (name: string, key: "win" | "draw" | "loss") => {
      const s = stat.get(name) ?? { win: 0, draw: 0, loss: 0 };
      s[key]++;
      stat.set(name, s);
    };
    for (const g of done) {
      if (g.winner === "DRAW") {
        bump(g.challenger, "draw");
        bump(g.opponent, "draw");
      } else if (g.winner === g.challenger) {
        bump(g.challenger, "win");
        bump(g.opponent, "loss");
      } else if (g.winner === g.opponent) {
        bump(g.opponent, "win");
        bump(g.challenger, "loss");
      }
    }

    const names = [...stat.keys()];
    const users = await prisma.user.findMany({
      where: { name: { in: names } },
      select: { name: true, fullName: true, avatar: true },
    });
    const byName = new Map(users.map((u) => [u.name, u]));

    const leaderboard = names
      .map((name) => {
        const s = stat.get(name)!;
        return {
          name,
          fullName: byName.get(name)?.fullName ?? null,
          avatar: byName.get(name)?.avatar ?? null,
          win: s.win,
          draw: s.draw,
          loss: s.loss,
          total: s.win + s.draw + s.loss,
        };
      })
      .sort((a, b) => b.win - a.win || b.total - a.total);

    return NextResponse.json(leaderboard);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
