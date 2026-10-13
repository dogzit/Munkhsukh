import { randomInt } from "crypto";
import prisma from "@/lib/prisma";
import { pushToUser } from "@/lib/push";
import { isAdmin } from "@/lib/roles";
import { NextRequest, NextResponse, after } from "next/server";

type ApiError = { error: string };

/**
 * GET /api/random-picks
 * Сүүлийн сонголтууд — бүх хэрэглэгч харна (2-3 секунд тутам шалгана)
 */
export async function GET(req: NextRequest) {
  try {
    if (!req.headers.get("x-user-name")) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, { status: 401 });
    }

    const picks = await prisma.randomPick.findMany({ take: 10, orderBy: { createdAt: "desc" } });

    // Нэрсийг бүтэн нэр, зурагтай нь харуулна
    const names = new Set<string>();
    picks.forEach((p) => names.add(p.winner));
    picks[0]?.pool.forEach((n) => names.add(n));
    const users = names.size
      ? await prisma.user.findMany({
          where: { name: { in: [...names] } },
          select: { name: true, fullName: true, avatar: true },
        })
      : [];
    const byName = new Map(users.map((u) => [u.name, u]));
    const person = (n: string) => ({
      name: n,
      label: byName.get(n)?.fullName || n,
      avatar: byName.get(n)?.avatar ?? null,
    });

    return NextResponse.json({
      isAdmin: await isAdmin(req),
      serverNow: Date.now(),
      picks: picks.map((p, i) => ({
        id: p.id,
        createdAt: p.createdAt,
        winner: person(p.winner),
        poolSize: p.pool.length,
        // Хөдөлгөөнд зөвхөн хамгийн сүүлийнх хэрэгтэй
        poolLabels: i === 0 ? p.pool.map((n) => person(n).label) : undefined,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, { status: 500 });
  }
}

/**
 * POST /api/random-picks  (зөвхөн админ)
 * Body: { pool: string[], exclude?: string[] }
 * Сервер санамсаргүй сонгоно — бүгд ижил үр дүн харна
 */
export async function POST(req: NextRequest) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName || !(await isAdmin(req))) {
      return NextResponse.json({ error: "Зөвхөн админ сонгоно" } satisfies ApiError, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as { pool?: unknown; exclude?: unknown } | null;
    const asNames = (v: unknown) =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 200) : [];
    const requested = asNames(body?.pool);
    const exclude = new Set(asNames(body?.exclude));

    // Зөвхөн бодит, зөвшөөрөгдсөн сурагчдаас
    const valid = await prisma.user.findMany({
      where: { name: { in: requested, not: "admin" }, status: "APPROVED" },
      select: { name: true },
    });
    const pool = valid.map((u) => u.name);
    const candidates = pool.filter((n) => !exclude.has(n));
    if (candidates.length === 0) {
      return NextResponse.json({ error: "Сонгох сурагч алга" } satisfies ApiError, { status: 400 });
    }

    const winner = candidates[randomInt(candidates.length)];
    const pick = await prisma.randomPick.create({
      data: { winner, pool: candidates, createdBy: userName },
    });

    if (winner !== userName) {
      after(() =>
        pushToUser(winner, { title: "🎯 Чи сонгогдлоо!", body: "Сурагч сонгох", href: "/random" }),
      );
    }

    return NextResponse.json({ id: pick.id, winner }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, { status: 500 });
  }
}

/** DELETE /api/random-picks  (зөвхөн админ) — түүх цэвэрлэх */
export async function DELETE(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, { status: 403 });
    }
    await prisma.randomPick.deleteMany({});
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, { status: 500 });
  }
}
