import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

type ApiError = { error: string };

/**
 * PATCH /api/admin/settings
 * Body: { busBookingEnabled: boolean }
 * Admin-only: toggles whether the bus booking panel shows on the main page.
 */
export async function PATCH(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, {
        status: 401,
      });
    }

    const body = (await req.json().catch(() => null)) as {
      busBookingEnabled?: unknown;
    } | null;

    if (typeof body?.busBookingEnabled !== "boolean") {
      return NextResponse.json(
        { error: "busBookingEnabled must be a boolean" } satisfies ApiError,
        { status: 400 },
      );
    }

    const value = body.busBookingEnabled ? "true" : "false";
    await prisma.appSetting.upsert({
      where: { key: "busBookingEnabled" },
      update: { value },
      create: { key: "busBookingEnabled", value },
    });

    return NextResponse.json({ busBookingEnabled: body.busBookingEnabled });
  } catch (e) {
    console.error("admin settings PATCH error:", e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, {
      status: 500,
    });
  }
}
