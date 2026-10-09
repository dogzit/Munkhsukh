import prisma from "@/lib/prisma";
import {
  hashPin,
  isValidPin,
  normalizePin,
  createAuthToken,
  setAuthTokenCookie,
} from "@/lib/auth";
import { NextResponse } from "next/server";

type ApiError = { error: string };

function isNonEmptyString(x: unknown): x is string {
  return typeof x === "string" && x.trim().length > 0;
}

export async function POST(req: Request) {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!raw || typeof raw !== "object") {
      return NextResponse.json({ error: "Invalid body" } satisfies ApiError, {
        status: 400,
      });
    }

    const body = raw as Record<string, unknown>;
    const name = body.name;
    // Accept both `number` and legacy `pin` field names.
    const pin = body.pin ?? body.number;

    if (!isNonEmptyString(name)) {
      return NextResponse.json(
        { error: "name is required" } satisfies ApiError,
        { status: 400 },
      );
    }
    if (!isValidPin(pin)) {
      return NextResponse.json(
        { error: "number must be 4 or 6 digits" } satisfies ApiError,
        { status: 400 },
      );
    }

    const nameTrimmed = name.trim();
    const pinTrimmed = normalizePin(pin);

    const user = await prisma.user.findUnique({
      where: { name: nameTrimmed },
    });
    // Avoid leaking which field was wrong.
    if (!user) {
      return NextResponse.json(
        { error: "Invalid name or pin" } satisfies ApiError,
        { status: 401 },
      );
    }

    const computedHash = hashPin(pinTrimmed, user.pinSalt);
    if (computedHash !== user.pinHash) {
      return NextResponse.json(
        { error: "Invalid name or pin" } satisfies ApiError,
        { status: 401 },
      );
    }

    if (user.status === "PENDING") {
      return NextResponse.json(
        {
          error: "Таны бүртгэлийг админ хараахан зөвшөөрөөгүй байна. Зөвшөөрөгдөхөөр имэйлээр мэдэгдэнэ.",
          pending: true,
        },
        { status: 403 },
      );
    }

    const token = await createAuthToken({
      id: user.id,
      name: user.name,
      role: user.role,
    });

    const res = NextResponse.json(
      { ok: true, name: user.name, role: user.role },
      { status: 200 },
    );
    setAuthTokenCookie(res, token);
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, {
      status: 500,
    });
  }
}

