import prisma from "@/lib/prisma";
import { pushToUser } from "@/lib/push";
import { getMyRoles } from "@/lib/roles";
import { canDecideLeave } from "@/lib/leave";
import { NextRequest, NextResponse, after } from "next/server";

type ApiError = { error: string };
type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/leave/:id  — ангийн багш (туршилтын үед админ)
 * Body: { action: "approve" | "decline" }
 */
export async function PATCH(req: NextRequest, context: Ctx) {
  try {
    const me = await getMyRoles(req);
    const userName = req.headers.get("x-user-name");
    if (!me || !userName || !canDecideLeave(me.role)) {
      return NextResponse.json({ error: "Зөвхөн ангийн багш шийднэ" } satisfies ApiError, { status: 403 });
    }

    const { id } = await context.params;
    const body = (await req.json().catch(() => null)) as { action?: unknown } | null;
    const action = body?.action;
    if (action !== "approve" && action !== "decline") {
      return NextResponse.json({ error: "action: approve | decline" } satisfies ApiError, { status: 400 });
    }

    const request = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: "Not found" } satisfies ApiError, { status: 404 });
    if (request.status !== "PENDING") {
      return NextResponse.json({ error: "Аль хэдийн шийдэгдсэн" } satisfies ApiError, { status: 400 });
    }

    const approved = action === "approve";
    await prisma.leaveRequest.update({
      where: { id },
      data: { status: approved ? "APPROVED" : "DECLINED", decidedBy: userName, decidedAt: new Date() },
    });

    const range = request.fromDate === request.toDate ? request.fromDate : `${request.fromDate} – ${request.toDate}`;
    const title = approved ? "✅ Чөлөөний хүсэлт зөвшөөрөгдлөө" : "❌ Чөлөөний хүсэлт татгалзагдлаа";
    await prisma.notification.create({
      data: { userName: request.userName, title, body: range, icon: approved ? "✅" : "❌", href: "/leave" },
    });
    after(() => pushToUser(request.userName, { title, body: range, href: "/leave" }));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, { status: 500 });
  }
}

/** DELETE /api/leave/:id — өөрийн хүлээгдэж буй хүсэлтийг цуцлах */
export async function DELETE(req: NextRequest, context: Ctx) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, { status: 401 });

    const { id } = await context.params;
    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      select: { userName: true, status: true },
    });
    if (!request) return NextResponse.json({ error: "Not found" } satisfies ApiError, { status: 404 });
    if (request.userName !== userName || request.status !== "PENDING") {
      return NextResponse.json({ error: "Цуцлах боломжгүй" } satisfies ApiError, { status: 403 });
    }

    await prisma.leaveRequest.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, { status: 500 });
  }
}
