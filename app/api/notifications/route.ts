import prisma from "@/lib/prisma";
import { isAdminFromHeaders } from "@/lib/requireAuth";
import { NextRequest, NextResponse, after } from "next/server";
import { pushToUser } from "@/lib/push";

/**
 * GET /api/notifications
 * Хэрэглэгчийн мэдэгдлүүдийг авна
 */
export async function GET(req: NextRequest) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { userName },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const unreadCount = await prisma.notification.count({
      where: { userName, read: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST /api/notifications
 * Шинэ мэдэгдэл үүсгэх (админ)
 */
export async function POST(req: NextRequest) {
  try {
    if (!isAdminFromHeaders(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { targetUser, title, body: notifBody, icon, href } = body;

    if (!targetUser || !title) {
      return NextResponse.json(
        { error: "targetUser and title are required" },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.create({
      data: {
        userName: targetUser,
        title,
        body: notifBody || null,
        icon: icon || null,
        href: href || null,
      },
    });

    after(() =>
      pushToUser(notification.userName, {
        title: `${notification.icon ? notification.icon + " " : ""}${notification.title}`,
        body: notification.body ?? undefined,
        href: notification.href ?? "/",
      }),
    );

    return NextResponse.json(notification, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications
 * Мэдэгдлийг уншсан болгох
 */
export async function PATCH(req: NextRequest) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, markAll } = body;

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userName, read: false },
        data: { read: true },
      });
    } else if (id) {
      await prisma.notification.update({
        where: { id },
        data: { read: true },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
