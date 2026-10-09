import prisma from "@/lib/prisma";
import { isAdminFromHeaders } from "@/lib/requireAuth";
import { NextRequest, NextResponse } from "next/server";

type ApiError = { error: string };

/**
 * GET /api/admin/users
 * Бүх хэрэглэгчийн жагсаалт (эрхийн хамт)
 */
export async function GET(req: NextRequest) {
  try {
    if (!isAdminFromHeaders(req)) {
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
 * Body: { name: string, role: "ADMIN" | "USER" }
 * Хэрэглэгчийн эрхийг өөрчлөх (өөрийн эрхийг хасахгүй)
 */
export async function PATCH(req: NextRequest) {
  try {
    if (!isAdminFromHeaders(req)) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, {
        status: 401,
      });
    }

    const body = (await req.json().catch(() => null)) as {
      name?: unknown;
      role?: unknown;
    } | null;

    const name =
      body && typeof body.name === "string" ? body.name.trim() : "";
    const role = body?.role;

    if (!name) {
      return NextResponse.json({ error: "name required" } satisfies ApiError, {
        status: 400,
      });
    }
    if (role !== "ADMIN" && role !== "USER") {
      return NextResponse.json(
        { error: "role must be ADMIN or USER" } satisfies ApiError,
        { status: 400 },
      );
    }

    // Өөрийн эрхийг хасахаас сэргийлнэ
    const selfName = req.headers.get("x-user-name");
    if (selfName && selfName === name && role === "USER") {
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

    const updated = await prisma.user.update({
      where: { name },
      data: { role },
      select: { name: true, role: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, {
      status: 500,
    });
  }
}
