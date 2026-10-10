import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";

type ApiError = { error: string };

/**
 * POST /api/admin/clear-data
 * Админ жил бүрийн хуучин өгөгдлийг устгах
 * Body: { type: "hwork" | "timetable" | "duty" | "all" }
 */
export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, {
        status: 401,
      });
    }

    const raw: unknown = await req.json().catch(() => null);
    if (!raw || typeof raw !== "object") {
      return NextResponse.json({ error: "Invalid body" } satisfies ApiError, {
        status: 400,
      });
    }

    const body = raw as Record<string, unknown>;
    const type = body.type;

    if (type !== "hwork" && type !== "timetable" && type !== "duty" && type !== "all") {
      return NextResponse.json(
        { error: "type must be 'hwork', 'timetable', 'duty', or 'all'" } satisfies ApiError,
        { status: 400 }
      );
    }

    const results: Record<string, number> = {};

    if (type === "hwork" || type === "all") {
      const deleted = await prisma.hwork.deleteMany();
      results.hwork = deleted.count;
    }

    if (type === "timetable" || type === "all") {
      const deleted = await prisma.timetable.deleteMany();
      results.timetable = deleted.count;
    }

    if (type === "duty" || type === "all") {
      const deleted = await prisma.dutySchedule.deleteMany();
      results.duty = deleted.count;
    }

    return NextResponse.json({
      ok: true,
      message: "Өгөгдөл амжилттай устгагдлаа",
      deleted: results,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, {
      status: 500,
    });
  }
}

/**
 * GET /api/admin/clear-data
 * Хэрэглэгчийн тоо, даалгаврын тоо зэргийг харуулна
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, {
        status: 401,
      });
    }

    const [hworkCount, timetableCount, dutyCount, userCount] = await Promise.all([
      prisma.hwork.count(),
      prisma.timetable.count(),
      prisma.dutySchedule.count(),
      prisma.user.count(),
    ]);

    return NextResponse.json({
      hwork: hworkCount,
      timetable: timetableCount,
      duty: dutyCount,
      users: userCount,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, {
      status: 500,
    });
  }
}
