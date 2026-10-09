import prisma from "@/lib/prisma";
import { isValidBranch } from "@/lib/branches";
import { isAdminFromHeaders } from "@/lib/requireAuth";
import { NextRequest, NextResponse } from "next/server";

type ApiError = { error: string };

/**
 * GET /api/branch
 * Миний салаа + салаа бүрийн гишүүдийн жагсаалт
 */
export async function GET(req: NextRequest) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, { status: 401 });
    }

    const [me, users] = await Promise.all([
      prisma.user.findUnique({
        where: { name: userName },
        select: { branch: true, branchLeader: true },
      }),
      prisma.user.findMany({
        where: { name: { not: "admin" }, status: "APPROVED", branch: { not: null } },
        select: { name: true, fullName: true, avatar: true, branch: true, branchLeader: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const members: Record<
      number,
      { name: string; fullName: string | null; avatar: string | null; branchLeader: boolean }[]
    > = {
      1: [],
      2: [],
      3: [],
    };
    for (const u of users) {
      if (u.branch && members[u.branch]) {
        members[u.branch].push({
          name: u.name,
          fullName: u.fullName,
          avatar: u.avatar,
          branchLeader: u.branchLeader,
        });
      }
    }

    return NextResponse.json({
      myBranch: me?.branch ?? null,
      amBranchLeader: me?.branchLeader ?? false,
      isAdmin: isAdminFromHeaders(req),
      members,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, { status: 500 });
  }
}

/**
 * POST /api/branch
 * Body: { branch: 1|2|3|null, name?: string }
 * Хэрэглэгч салаагаа нэг удаа өөрөө сонгоно. Дараа нь зөвхөн админ
 * (name дамжуулж) хэнийг ч гэсэн өөр салаа руу шилжүүлж/хасаж чадна.
 */
export async function POST(req: NextRequest) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as {
      branch?: unknown;
      name?: unknown;
    } | null;
    const branch = body?.branch ?? null;
    if (branch !== null && !isValidBranch(branch)) {
      return NextResponse.json({ error: "branch must be 1, 2 or 3" } satisfies ApiError, {
        status: 400,
      });
    }

    const admin = isAdminFromHeaders(req);
    const target =
      typeof body?.name === "string" && body.name.trim() ? body.name.trim() : userName;

    if (target !== userName && !admin) {
      return NextResponse.json({ error: "Forbidden" } satisfies ApiError, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { name: target },
      select: { branch: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Not found" } satisfies ApiError, { status: 404 });
    }

    // Энгийн хэрэглэгч нэг сонгосон салаагаа өөрөө солих боломжгүй
    if (!admin && user.branch !== null) {
      return NextResponse.json(
        { error: "Салаагаа солих бол админд хандана уу" } satisfies ApiError,
        { status: 403 },
      );
    }
    if (!admin && branch === null) {
      return NextResponse.json({ error: "branch required" } satisfies ApiError, { status: 400 });
    }

    // Салаа солигдвол салааны даргын эрх хасагдана
    await prisma.user.update({
      where: { name: target },
      data: { branch, ...(branch !== user.branch ? { branchLeader: false } : {}) },
    });
    return NextResponse.json({ ok: true, branch });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, { status: 500 });
  }
}
