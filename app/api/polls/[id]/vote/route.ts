import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type ApiError = { error: string };

/**
 * POST /api/polls/:id/vote
 * Body: { option: number } — нэг хүн нэг санал, хугацаа дуусахаас өмнө сольж болно
 */
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, { status: 401 });
    }
    const { id } = await context.params;
    const body = (await req.json().catch(() => null)) as { option?: unknown } | null;
    const option = body?.option;

    const poll = await prisma.poll.findUnique({
      where: { id },
      select: { options: true, endsAt: true },
    });
    if (!poll) return NextResponse.json({ error: "Not found" } satisfies ApiError, { status: 404 });
    if (poll.endsAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Санал асуулга дууссан" } satisfies ApiError, { status: 400 });
    }
    if (typeof option !== "number" || !Number.isInteger(option) || option < 0 || option >= poll.options.length) {
      return NextResponse.json({ error: "Буруу сонголт" } satisfies ApiError, { status: 400 });
    }

    await prisma.pollVote.upsert({
      where: { pollId_userName: { pollId: id, userName } },
      create: { pollId: id, userName, option },
      update: { option },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, { status: 500 });
  }
}
