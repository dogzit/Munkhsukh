import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isOnline } from "@/lib/presence";

/**
 * GET /api/students
 * Зөвшөөрөгдсөн бүх сурагчийн жагсаалт (нэвтэрсэн хэрэглэгчид харна)
 */
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { name: { not: "admin" }, status: "APPROVED" },
      select: {
        name: true,
        fullName: true,
        avatar: true,
        bio: true,
        role: true,
        branch: true,
        branchLeader: true,
        lastSeen: true,
      },
    });
    users.sort((a, b) => (a.fullName || a.name).localeCompare(b.fullName || b.name, "mn"));
    const now = Date.now();
    return NextResponse.json(users.map(({ lastSeen, ...u }) => ({ ...u, online: isOnline(lastSeen, now) })));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
