import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

export async function POST(req: NextRequest) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { seatId } = await req.json();

    if (!seatId) {
      return NextResponse.json(
        { error: "seatId шаардлагатай" },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.busBooking.deleteMany({ where: { seatId } }),
      prisma.busLayout.delete({ where: { seatId } }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Суудал бүрмөсөн устлаа",
    });
  } catch (error) {
    console.error("Delete Seat Error:", error);
    return NextResponse.json(
      { error: "Устгахад алдаа гарлаа" },
      { status: 500 },
    );
  }
}
