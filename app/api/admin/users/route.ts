import prisma from "@/lib/prisma";
import { isAdmin, MAX_HOMEWORK_POSTERS } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";

type ApiError = { error: string };

/**
 * GET /api/admin/users
 * Бүх хэрэглэгчийн жагсаалт (эрхийн хамт)
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, {
        status: 401,
      });
    }

    const users = await prisma.user.findMany({
      select: {
        name: true,
        role: true,
        fullName: true,
        avatar: true,
        email: true,
        phone: true,
        birthDate: true,
        status: true,
        branch: true,
        branchLeader: true,
        createdAt: true,
        _count: { select: { todos: true, busBookings: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(users);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, {
      status: 500,
    });
  }
}

/**
 * PATCH /api/admin/users
 * Body: { name: string, role?: "ADMIN" | "LEADER" | "TEACHER" | "HOMEWORK" | "USER", branchLeader?: boolean }
 * Хэрэглэгчийн эрх (админ / ангийн дарга / хэрэглэгч) болон салааны
 * даргын эрхийг өөрчлөх (өөрийн админ эрхийг хасахгүй)
 */
export async function PATCH(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, {
        status: 401,
      });
    }

    const body = (await req.json().catch(() => null)) as {
      name?: unknown;
      role?: unknown;
      branchLeader?: unknown;
    } | null;

    const name =
      body && typeof body.name === "string" ? body.name.trim() : "";
    const role = body?.role;
    const branchLeader = body?.branchLeader;

    if (!name) {
      return NextResponse.json({ error: "name required" } satisfies ApiError, {
        status: 400,
      });
    }
    if (role !== undefined && role !== "ADMIN" && role !== "LEADER" && role !== "TEACHER" && role !== "HOMEWORK" && role !== "USER") {
      return NextResponse.json(
        { error: "role must be ADMIN, LEADER, TEACHER, HOMEWORK or USER" } satisfies ApiError,
        { status: 400 },
      );
    }
    if (branchLeader !== undefined && typeof branchLeader !== "boolean") {
      return NextResponse.json(
        { error: "branchLeader must be boolean" } satisfies ApiError,
        { status: 400 },
      );
    }
    if (role === undefined && branchLeader === undefined) {
      return NextResponse.json(
        { error: "role or branchLeader required" } satisfies ApiError,
        { status: 400 },
      );
    }

    // Өөрийн эрхийг хасахаас сэргийлнэ
    const selfName = req.headers.get("x-user-name");
    if (selfName && selfName === name && role !== undefined && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Өөрийн эрхийг хасах боломжгүй" } satisfies ApiError,
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { name } });
    if (!user) {
      return NextResponse.json({ error: "Not found" } satisfies ApiError, {
        status: 404,
      });
    }

    // Даалгавар тавигч хүүхэд дээд тал нь 3
    if (role === "HOMEWORK" && user.role !== "HOMEWORK") {
      const count = await prisma.user.count({ where: { role: "HOMEWORK" } });
      if (count >= MAX_HOMEWORK_POSTERS) {
        return NextResponse.json(
          {
            error: `Даалгавар тавигч дээд тал нь ${MAX_HOMEWORK_POSTERS} хүн байна. Эхлээд нэгнийх нь эрхийг хасна уу`,
          } satisfies ApiError,
          { status: 400 },
        );
      }
    }

    if (branchLeader === true && user.branch === null) {
      return NextResponse.json(
        { error: "Эхлээд салаанд оруулна уу" } satisfies ApiError,
        { status: 400 },
      );
    }

    const updated = await prisma.user.update({
      where: { name },
      data: {
        ...(role !== undefined ? { role } : {}),
        ...(branchLeader !== undefined ? { branchLeader } : {}),
      },
      select: { name: true, role: true, branchLeader: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, {
      status: 500,
    });
  }
}

/**
 * DELETE /api/admin/users
 * Body: { name: string }
 * Хэрэглэгчийг бүрмөсөн устгана (жишээ нь ангиас шилжсэн сурагч).
 * Өөрийгөө болон админыг устгахгүй. Чатын мессеж түүх болж үлдэнэ.
 */
export async function DELETE(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, { status: 401 });
    }
    const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
    const name = body && typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name required" } satisfies ApiError, { status: 400 });
    }
    if (name === req.headers.get("x-user-name")) {
      return NextResponse.json({ error: "Өөрийгөө устгах боломжгүй" } satisfies ApiError, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { name }, select: { role: true } });
    if (!user) {
      return NextResponse.json({ error: "Not found" } satisfies ApiError, { status: 404 });
    }
    if (user.role === "ADMIN" || name.toLowerCase() === "admin") {
      return NextResponse.json(
        { error: "Админыг устгах боломжгүй. Эхлээд эрхийг нь хасна уу" } satisfies ApiError,
        { status: 400 },
      );
    }

    // Нэрээр холбогдсон (cascade-гүй) өгөгдлийг цэвэрлэнэ
    const roster = await prisma.cleaningRoster.findUnique({ where: { id: "main" } });
    await prisma.$transaction([
      prisma.hworkCheck.deleteMany({ where: { userName: name } }),
      prisma.notification.deleteMany({ where: { userName: name } }),
      prisma.gameScore.deleteMany({ where: { userName: name } }),
      prisma.xoGame.deleteMany({
        where: { status: { in: ["PENDING", "ACTIVE"] }, OR: [{ challenger: name }, { opponent: name }] },
      }),
      ...(roster && Array.isArray(roster.groups)
        ? [
            prisma.cleaningRoster.update({
              where: { id: "main" },
              data: {
                groups: (roster.groups as unknown[]).map((g) =>
                  Array.isArray(g) ? g.filter((x) => x !== name) : [],
                ),
              },
            }),
          ]
        : []),
      prisma.user.delete({ where: { name } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, { status: 500 });
  }
}
