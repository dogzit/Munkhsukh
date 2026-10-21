import prisma from "@/lib/prisma";
import { getMyRoles } from "@/lib/roles";
import { MAX_GROUPS, MAX_MEMBERS, canSeeCleaning, ubNow } from "@/lib/cleaning";
import { getRoster, notifyTodayIfNeeded } from "@/lib/cleaningServer";
import { NextResponse, after } from "next/server";

/** GET — хуваарь + гишүүдийн нэр/зураг */
export async function GET(req: Request) {
  try {
    const me = await getMyRoles(req);
    if (!canSeeCleaning(me?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const r = await getRoster();
    const users = await prisma.user.findMany({
      where: { name: { in: r.groups.flat() } },
      select: { name: true, fullName: true, avatar: true },
    });

    // Cron ажиллаагүй байсан ч өглөө хэн нэгэн сайт нээхэд мэдэгдэл явна
    after(() => notifyTodayIfNeeded().catch((e) => console.error(e)));

    return NextResponse.json({
      groups: r.groups,
      anchorDate: r.anchorDate,
      anchorIndex: r.anchorIndex,
      skipWeekends: r.skipWeekends,
      today: ubNow().ymd,
      users,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** PUT — админ хуваарийг хадгална */
export async function PUT(req: Request) {
  try {
    const me = await getMyRoles(req);
    if (me?.role !== "ADMIN") {
      return NextResponse.json({ error: "Зөвхөн админ" }, { status: 403 });
    }
    const body = (await req.json().catch(() => null)) as {
      groups?: unknown;
      anchorDate?: unknown;
      anchorIndex?: unknown;
      skipWeekends?: unknown;
    } | null;

    const groups = body?.groups;
    if (
      !Array.isArray(groups) ||
      groups.length < 1 ||
      groups.length > MAX_GROUPS ||
      !groups.every(
        (g) => Array.isArray(g) && g.length <= MAX_MEMBERS && g.every((x) => typeof x === "string" && x.trim()),
      )
    ) {
      return NextResponse.json({ error: "Бүлгийн мэдээлэл буруу" }, { status: 400 });
    }
    const clean = (groups as string[][]).map((g) => [...new Set(g.map((x) => x.trim()))]);
    const all = clean.flat();
    if (new Set(all).size !== all.length) {
      return NextResponse.json({ error: "Нэг хүн хоёр бүлэгт орсон байна" }, { status: 400 });
    }
    const existing = await prisma.user.count({ where: { name: { in: all } } });
    if (existing !== all.length) {
      return NextResponse.json({ error: "Олдохгүй хэрэглэгч байна" }, { status: 400 });
    }

    const anchorDate =
      typeof body?.anchorDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.anchorDate)
        ? body.anchorDate
        : ubNow().ymd;
    const anchorIndex =
      typeof body?.anchorIndex === "number" && Number.isInteger(body.anchorIndex)
        ? Math.min(Math.max(body.anchorIndex, 0), clean.length - 1)
        : 0;
    const skipWeekends = body?.skipWeekends !== false;

    await prisma.cleaningRoster.upsert({
      where: { id: "main" },
      create: { id: "main", groups: clean, anchorDate, anchorIndex, skipWeekends },
      update: { groups: clean, anchorDate, anchorIndex, skipWeekends },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
