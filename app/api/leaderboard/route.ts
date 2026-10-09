import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Хэрэглэгчид + нийт даалгавар + хэрэглэгч бүрийн хийсэн даалгаврын тоо
    const [users, totalHworks, checks] = await Promise.all([
      prisma.user.findMany({
        where: { name: { not: "admin" }, status: "APPROVED" },
        select: { name: true },
      }),
      prisma.hwork.count(),
      prisma.hworkCheck.groupBy({
        by: ["userName"],
        _count: { _all: true },
      }),
    ]);

    const checkMap = new Map(
      checks.map((c) => [c.userName, c._count._all]),
    );

    const leaderboard = users
      .map((u) => ({
        name: u.name,
        total: totalHworks,
        completed: checkMap.get(u.name) ?? 0,
      }))
      .sort((a, b) => b.completed - a.completed);

    return NextResponse.json(leaderboard);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
