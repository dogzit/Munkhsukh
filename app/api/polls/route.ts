import prisma from "@/lib/prisma";
import { pushToAllUsers } from "@/lib/push";
import { isAdmin } from "@/lib/roles";
import { NextRequest, NextResponse, after } from "next/server";

type ApiError = { error: string };

// Санал асуулга 3 минут үргэлжилнэ
const POLL_DURATION_MS = 3 * 60 * 1000;

/**
 * GET /api/polls
 * Сүүлийн санал асуулгууд, саналын тоо, миний сонголт.
 * Админд хэн юу сонгосныг харуулна.
 */
export async function GET(req: NextRequest) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, { status: 401 });
    }
    const admin = await isAdmin(req);

    const polls = await prisma.poll.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { votes: { select: { userName: true, option: true } } },
    });

    const now = Date.now();
    return NextResponse.json({
      isAdmin: admin,
      serverNow: now,
      polls: polls.map((p) => {
        const counts = p.options.map((_, i) => p.votes.filter((v) => v.option === i).length);
        return {
          id: p.id,
          question: p.question,
          options: p.options,
          createdBy: p.createdBy,
          createdAt: p.createdAt,
          endsAt: p.endsAt,
          open: p.endsAt.getTime() > now,
          counts,
          total: p.votes.length,
          myVote: p.votes.find((v) => v.userName === userName)?.option ?? null,
          voters: admin
            ? p.options.map((_, i) => p.votes.filter((v) => v.option === i).map((v) => v.userName))
            : undefined,
        };
      }),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, { status: 500 });
  }
}

/**
 * POST /api/polls  (зөвхөн админ)
 * Body: { question: string, options: string[] }  — 2-6 хариулт
 */
export async function POST(req: NextRequest) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName || !(await isAdmin(req))) {
      return NextResponse.json({ error: "Зөвхөн админ санал асуулга үүсгэнэ" } satisfies ApiError, {
        status: 403,
      });
    }

    const body = (await req.json().catch(() => null)) as {
      question?: unknown;
      options?: unknown;
    } | null;
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    const options = Array.isArray(body?.options)
      ? body.options
          .filter((o): o is string => typeof o === "string")
          .map((o) => o.trim())
          .filter(Boolean)
      : [];

    if (!question || question.length > 200) {
      return NextResponse.json({ error: "Асуулт 1-200 тэмдэгт байна" } satisfies ApiError, { status: 400 });
    }
    if (options.length < 2 || options.length > 6 || options.some((o) => o.length > 80)) {
      return NextResponse.json(
        { error: "2-6 хариулт, тус бүр 80 тэмдэгт хүртэл" } satisfies ApiError,
        { status: 400 },
      );
    }
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
      return NextResponse.json({ error: "Ижил хариулт давхардсан байна" } satisfies ApiError, { status: 400 });
    }

    const poll = await prisma.poll.create({
      data: {
        question,
        options,
        createdBy: userName,
        endsAt: new Date(Date.now() + POLL_DURATION_MS),
      },
    });

    after(() =>
      pushToAllUsers({
        title: "📊 Шинэ санал асуулга",
        body: `${question.slice(0, 90)} — 3 минутын дотор саналаа өгөөрэй`,
        href: "/poll",
        exceptUserName: userName,
      }),
    );

    return NextResponse.json(poll, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, { status: 500 });
  }
}
