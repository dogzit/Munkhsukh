import prisma from "@/lib/prisma";
import {
  hashPin,
  isValidPin,
  makePinSalt,
  normalizePin,
} from "@/lib/auth";
import { notifyAdminsOfSignup } from "@/lib/signupApproval";
import { NextResponse, after } from "next/server";

type ApiError = { error: string };

function isNonEmptyString(x: unknown): x is string {
  return typeof x === "string" && x.trim().length > 0;
}

function isValidEmail(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) &&
    v.length <= 254
  );
}

const SIGNUP_OTP_MAX_AGE_MS = 30 * 60 * 1000;

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
    const pin = body.pin ?? body.number;
    const fullName = body.fullName;
    const emailRaw = body.email;
    const phone = body.phone;
    const birthDateRaw = body.birthDate;

    if (!isNonEmptyString(name)) {
      return NextResponse.json(
        { error: "Хэрэглэгчийн нэр шаардлагатай" } satisfies ApiError,
        { status: 400 },
      );
    }
    if (!isValidPin(pin)) {
      return NextResponse.json(
        { error: "PIN 4 эсвэл 6 оронтой байх ёстой" } satisfies ApiError,
        { status: 400 },
      );
    }
    if (!isNonEmptyString(fullName)) {
      return NextResponse.json(
        { error: "Бүтэн нэр шаардлагатай" } satisfies ApiError,
        { status: 400 },
      );
    }
    if (!isValidEmail(emailRaw)) {
      return NextResponse.json(
        { error: "Хүчинтэй email шаардлагатай" } satisfies ApiError,
        { status: 400 },
      );
    }

    const email = emailRaw.trim().toLowerCase();
    const nameTrimmed = name.trim();
    const pinTrimmed = normalizePin(pin);

    // Ensure email was OTP-verified within 30 minutes (via signup verify-otp).
    const verifiedOtp = await prisma.emailOtp.findFirst({
      where: {
        email,
        purpose: "SIGNUP",
        used: true,
      },
      orderBy: { createdAt: "desc" },
    });
    if (
      !verifiedOtp ||
      Date.now() - verifiedOtp.createdAt.getTime() > SIGNUP_OTP_MAX_AGE_MS
    ) {
      return NextResponse.json(
        {
          error: "Email баталгаажаагүй. Дахин баталгаажуулна уу",
        } satisfies ApiError,
        { status: 403 },
      );
    }

    const pinSalt = makePinSalt();
    const pinHash = hashPin(pinTrimmed, pinSalt);

    const birthDate =
      isNonEmptyString(birthDateRaw) && !Number.isNaN(Date.parse(birthDateRaw))
        ? new Date(birthDateRaw)
        : null;

    const user = await prisma.user.create({
      data: {
        name: nameTrimmed,
        pinSalt,
        pinHash,
        fullName: isNonEmptyString(fullName) ? fullName.trim().slice(0, 100) : null,
        email,
        phone: isNonEmptyString(phone) ? phone.trim().slice(0, 20) : null,
        birthDate,
        // Шинэ хэрэглэгч админ зөвшөөрөх хүртэл нэвтэрч чадахгүй
        status: "PENDING",
      },
    });

    after(() => notifyAdminsOfSignup(user));

    return NextResponse.json(
      { ok: true, pending: true, name: user.name },
      { status: 201 },
    );
  } catch (e) {
    const code = (e as { code?: string } | undefined)?.code;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Энэ нэр эсвэл email бүртгэлтэй байна" } satisfies ApiError,
        { status: 409 },
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, {
      status: 500,
    });
  }
}
