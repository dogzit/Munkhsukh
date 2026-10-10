import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";

type ApiError = { error: string };

/**
 * GET /api/admin/stats
 * Админ dashboard-ын статистик картууд + queue панелууд + жагсаалтууд
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, {
        status: 401,
      });
    }

    const [
      users,
      hworkCount,
      timetableCount,
      dutyCount,
      postCount,
      chatCount,
      pendingBookings,
      pendingCount,
      admins,
      recentUsers,
      recentHworks,
      recentChats,
      notificationsToday,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.hwork.count(),
      prisma.timetable.count(),
      prisma.dutySchedule.count(),
      prisma.post.count(),
      prisma.chatMessage.count(),
      prisma.busBooking.findMany({
        where: { status: "PENDING" },
        select: { seatId: true, userName: true, email: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.busBooking.count({ where: { status: "PENDING" } }),
      prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { name: true },
      }),
      prisma.user.findMany({
        select: {
          name: true,
          fullName: true,
          avatar: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.hwork.findMany({
        select: { id: true, title: true, subject: true, date: true },
        orderBy: { date: "desc" },
        take: 6,
      }),
      prisma.chatMessage.findMany({
        select: { id: true, userName: true, text: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.notification.count({
        where: { createdAt: { gte: new Date(Date.now() - 86_400_000) } },
      }),
    ]);

    return NextResponse.json({
      cards: {
        users,
        admins: admins.length,
        hworks: hworkCount,
        timetable: timetableCount,
        duty: dutyCount,
        posts: postCount,
        chats: chatCount,
        pendingBus: pendingCount,
        notificationsToday,
      },
      pendingBookings,
      recentUsers,
      recentHworks,
      recentChats,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, {
      status: 500,
    });
  }
}
