import prisma from "@/lib/prisma";
import { pushToUser } from "@/lib/push";
import { getMyRoles } from "@/lib/roles";
import { canDecideLeave, canUseLeave, isLeaveType, LEAVE_PUBLIC } from "@/lib/leave";
import { NextRequest, NextResponse, after } from "next/server";

type ApiError = { error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const userSelect = { select: { fullName: true, avatar: true, branch: true } } as const;

/**
 * GET /api/leave
 * Миний хүсэлтүүд; багш/админд бүх хүсэлт
 */
export async function GET(req: NextRequest) {
  try {
    const me = await getMyRoles(req);
    const userName = req.headers.get("x-user-name");
    if (!me || !userName) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, { status: 401 });
    }
    if (!canUseLeave(me.role)) {
      return NextResponse.json({ error: "Not available" } satisfies ApiError, { status: 403 });
    }

    const canDecide = canDecideLeave(me.role);
    const [mine, all] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: { userName },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      canDecide
        ? prisma.leaveRequest.findMany({
            orderBy: { createdAt: "desc" },
            take: 100,
            include: { user: userSelect },
          })
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      canDecide,
      mine,
      all: all.map(({ user, ...r }) => ({
        ...r,
        fullName: user.fullName,
        avatar: user.avatar,
        branch: user.branch,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, { status: 500 });
  }
}

/**
 * POST /api/leave
 * Body: { type: "SICK" | "PERSONAL", fromDate, toDate, reason, image? }
 * SICK — эмнэлгийн бичгийн зураг заавал, PERSONAL — шалтгаан заавал
 */
export async function POST(req: NextRequest) {
  try {
    const me = await getMyRoles(req);
    const userName = req.headers.get("x-user-name");
    if (!me || !userName) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, { status: 401 });
    }
    if (!canUseLeave(me.role)) {
      return NextResponse.json({ error: "Not available" } satisfies ApiError, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const type = body?.type;
    const fromDate = typeof body?.fromDate === "string" ? body.fromDate : "";
    const toDate = typeof body?.toDate === "string" ? body.toDate : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    const image =
      typeof body?.image === "string" && body.image.startsWith("https://res.cloudinary.com/")
        ? body.image
        : null;

    if (!isLeaveType(type)) {
      return NextResponse.json({ error: "Төрлөө сонгоно уу" } satisfies ApiError, { status: 400 });
    }
    if (!DATE_RE.test(fromDate) || !DATE_RE.test(toDate) || toDate < fromDate) {
      return NextResponse.json({ error: "Огноо буруу байна" } satisfies ApiError, { status: 400 });
    }
    if (reason.length > 1000) {
      return NextResponse.json({ error: "Шалтгаан 1000 тэмдэгтээс хэтэрсэн" } satisfies ApiError, { status: 400 });
    }
    if (type === "SICK" && !image) {
      return NextResponse.json({ error: "Эмнэлгийн бичгийн зургаа оруулна уу" } satisfies ApiError, { status: 400 });
    }
    if (type === "PERSONAL" && !reason) {
      return NextResponse.json({ error: "Чөлөө авах шалтгаанаа бичнэ үү" } satisfies ApiError, { status: 400 });
    }

    const request = await prisma.leaveRequest.create({
      data: { userName, type, fromDate, toDate, reason, image: type === "SICK" ? image : null },
    });

    // Шийдэх эрхтэй хүмүүст мэдэгдэнэ
    after(async () => {
      const deciders = await prisma.user.findMany({
        where: {
          OR: [
            { role: "ADMIN" },
            { name: { equals: "admin", mode: "insensitive" } },
            ...(LEAVE_PUBLIC ? [{ role: "TEACHER" }] : []),
          ],
          NOT: { name: userName },
        },
        select: { name: true },
      });
      const label = type === "SICK" ? "🤒 Өвчтэй" : "📝 Чөлөөтэй";
      await Promise.all(
        deciders.map((d) =>
          pushToUser(d.name, {
            title: `Чөлөөний хүсэлт: ${userName}`,
            body: `${label} • ${fromDate === toDate ? fromDate : `${fromDate} – ${toDate}`}`,
            href: "/leave",
          }),
        ),
      );
    });

    return NextResponse.json(request, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, { status: 500 });
  }
}
