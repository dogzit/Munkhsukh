import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";

type ApiError = { error: string };
type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/polls/:id  (зөвхөн админ)
 * Body: { action: "stop" } — санал асуулгыг хугацаанаас нь өмнө зогсооно
 */
export async function PATCH(req: NextRequest, context: Ctx) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, { status: 403 });
    }
    const { id } = await context.params;
    const body = (await req.json().catch(() => null)) as { action?: unknown } | null;
    if (body?.action !== "stop") {
      return NextResponse.json({ error: "action: stop required" } satisfies ApiError, { status: 400 });
    }

    const poll = await prisma.poll.findUnique({ where: { id }, select: { endsAt: true } });
    if (!poll) return NextResponse.json({ error: "Not found" } satisfies ApiError, { status: 404 });
    if (poll.endsAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Аль хэдийн дууссан" } satisfies ApiError, { status: 400 });
    }

    await prisma.poll.update({ where: { id }, data: { endsAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, { status: 500 });
  }
}

/** DELETE /api/polls/:id  (зөвхөн админ) */
export async function DELETE(req: NextRequest, context: Ctx) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, { status: 403 });
    }
    const { id } = await context.params;
    await prisma.poll.delete({ where: { id } }).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, { status: 500 });
  }
}
