import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings
 * Client-facing feature settings. Middleware-protected (any logged-in user).
 * Currently exposes: busBookingEnabled (default false — hidden).
 */
export async function GET() {
  try {
    const rows = await prisma.appSetting.findMany({
      where: { key: { in: ["busBookingEnabled"] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return NextResponse.json({
      busBookingEnabled: map.busBookingEnabled === "true",
    });
  } catch (e) {
    console.error("settings GET error:", e);
    return NextResponse.json(
      { busBookingEnabled: false, error: "Server error" },
      { status: 500 },
    );
  }
}
