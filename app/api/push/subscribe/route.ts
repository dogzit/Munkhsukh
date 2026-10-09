import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type ApiError = { error: string };

/**
 * POST /api/push/subscribe
 * Body: PushSubscription.toJSON() — { endpoint, keys: { p256dh, auth } }
 * Энэ төхөөрөмжийг push мэдэгдэл авахаар бүртгэнэ
 */
export async function POST(req: NextRequest) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, {
        status: 401,
      });
    }

    const body = (await req.json().catch(() => null)) as {
      endpoint?: unknown;
      keys?: { p256dh?: unknown; auth?: unknown };
    } | null;

    const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
    const p256dh = typeof body?.keys?.p256dh === "string" ? body.keys.p256dh : "";
    const auth = typeof body?.keys?.auth === "string" ? body.keys.auth : "";

    if (!endpoint.startsWith("https://") || !p256dh || !auth) {
      return NextResponse.json(
        { error: "Invalid subscription" } satisfies ApiError,
        { status: 400 },
      );
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { endpoint, p256dh, auth, userName },
      update: { p256dh, auth, userName },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, {
      status: 500,
    });
  }
}

/**
 * DELETE /api/push/subscribe
 * Body: { endpoint }
 * Энэ төхөөрөмжийн push бүртгэлийг цуцална
 */
export async function DELETE(req: NextRequest) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, {
        status: 401,
      });
    }

    const body = (await req.json().catch(() => null)) as {
      endpoint?: unknown;
    } | null;
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint, userName },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, {
      status: 500,
    });
  }
}
