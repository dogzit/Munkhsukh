import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

interface SeatInput {
  id: string;
  x: number;
  y: number;
  isPremium: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const seats: SeatInput[] = body.seats;

    if (!seats || !Array.isArray(seats)) {
      return NextResponse.json(
        { error: "Буруу өгөгдөл ирлээ" },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.busLayout.deleteMany({}),
      prisma.busLayout.createMany({
        data: seats.map((s) => ({
          seatId: s.id,
          x: s.x,
          y: s.y,
          isPremium: s.isPremium ?? false,
        })),
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Layout save error:", error);
    return NextResponse.json(
      {
        error: "Layout хадгалахад алдаа гарлаа",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
