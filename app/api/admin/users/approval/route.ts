import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { notifySignupDecision } from "@/lib/signupApproval";
import { NextRequest, NextResponse, after } from "next/server";

type ApiError = { error: string };

/**
 * POST /api/admin/users/approval
 * Body: { name: string, action: "approve" | "decline" }
 * Шинэ бүртгэлийн хүсэлтийг зөвшөөрөх / татгалзах.
 * Татгалзвал хэрэглэгчийг устгана (нэр, имэйл нь чөлөөлөгдөнө).
 */
export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, {
        status: 401,
      });
    }

    const body = (await req.json().catch(() => null)) as {
      name?: unknown;
      action?: unknown;
    } | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const action = body?.action;

    if (!name || (action !== "approve" && action !== "decline")) {
      return NextResponse.json(
        { error: "name and action (approve|decline) required" } satisfies ApiError,
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { name },
      select: { name: true, fullName: true, email: true, phone: true, status: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Not found" } satisfies ApiError, {
        status: 404,
      });
    }
    if (user.status !== "PENDING") {
      return NextResponse.json(
        { error: "Энэ хэрэглэгч хүлээгдэж буй төлөвт биш байна" } satisfies ApiError,
        { status: 400 },
      );
    }

    if (action === "approve") {
      await prisma.user.update({ where: { name }, data: { status: "APPROVED" } });
      await prisma.notification.create({
        data: {
          userName: name,
          title: "Тавтай морил! 🎉",
          body: "Таны бүртгэл зөвшөөрөгдлөө.",
          icon: "👋",
          href: "/",
        },
      });
    } else {
      await prisma.user.delete({ where: { name } });
    }

    after(() => notifySignupDecision(user, action === "approve"));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, {
      status: 500,
    });
  }
}
