import prisma from "@/lib/prisma";
import { getMyRoles } from "@/lib/roles";
import { canSuggest } from "@/lib/suggestions";
import { pushToUser } from "@/lib/push";
import { NextRequest, NextResponse, after } from "next/server";

/**
 * GET /api/suggestions
 * Админ бүх санал хүсэлтийг харна, бусад зөвхөн өөрийнхөө бичсэнийг харна.
 */
export async function GET(req: NextRequest) {
  try {
    const me = req.headers.get("x-user-name");
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const roles = await getMyRoles(req);
    if (!canSuggest(roles?.role)) return NextResponse.json({ error: "Хаалттай" }, { status: 403 });

    const isAdminUser = roles?.role === "ADMIN";
    const items = await prisma.suggestion.findMany({
      where: isAdminUser ? {} : { userName: me },
      orderBy: { createdAt: "desc" },
    });
    if (!isAdminUser) return NextResponse.json(items);

    const names = [...new Set(items.map((i) => i.userName))];
    const users = await prisma.user.findMany({
      where: { name: { in: names } },
      select: { name: true, fullName: true, avatar: true },
    });
    return NextResponse.json({ items, users });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST /api/suggestions { text }
 * Шинэ санал хүсэлт нэмнэ, бүх админд push илгээнэ.
 */
export async function POST(req: NextRequest) {
  try {
    const me = req.headers.get("x-user-name");
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const roles = await getMyRoles(req);
    if (!canSuggest(roles?.role)) return NextResponse.json({ error: "Хаалттай" }, { status: 403 });

    const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) return NextResponse.json({ error: "Бичих шаардлагатай" }, { status: 400 });
    if (text.length > 1000) return NextResponse.json({ error: "Хэт урт байна" }, { status: 400 });

    const item = await prisma.suggestion.create({ data: { userName: me, text } });

    after(async () => {
      try {
        const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { name: true } });
        const u = await prisma.user.findUnique({ where: { name: me }, select: { fullName: true } });
        const name = u?.fullName || me;
        await Promise.all(
          admins.map((a) =>
            Promise.all([
              prisma.notification.create({
                data: {
                  userName: a.name,
                  title: "💡 Шинэ санал хүсэлт",
                  body: `${name}: ${text.slice(0, 80)}`,
                  icon: "💡",
                  href: "/suggestions",
                },
              }),
              pushToUser(a.name, {
                title: "💡 Шинэ санал хүсэлт",
                body: `${name}: ${text.slice(0, 80)}`,
                href: "/suggestions",
                tag: "suggestion",
              }),
            ]),
          ),
        );
      } catch (e) {
        console.error("[suggestions] notify error", e);
      }
    });

    return NextResponse.json(item);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
