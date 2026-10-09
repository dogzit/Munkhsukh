import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { name: { not: "admin" }, status: "APPROVED" },
      select: { name: true },
    });

    if (users.length === 0) {
      return NextResponse.json({ error: "No students found" }, { status: 404 });
    }

    const random = users[Math.floor(Math.random() * users.length)];

    return NextResponse.json({
      name: random.name,
      total: users.length,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
