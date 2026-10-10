import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";

export const JWT_COOKIE_NAME = "auth_jwt";

export function isValidPin(pin: unknown): pin is string {
  if (typeof pin !== "string") return false;
  const v = pin.trim();
  return /^\d{4}$/.test(v) || /^\d{6}$/.test(v);
}

export function normalizePin(pin: string) {
  return pin.trim();
}

export function makePinSalt() {
  // 16 bytes => 32 hex chars
  return randomBytes(16).toString("hex");
}

export function hashPin(pin: string, salt: string) {
  return createHash("sha256").update(`${salt}:${pin}`).digest("hex");
}

// .env.example-ийн жишээ утга — хэн ч таах боломжтой тул хэзээ ч ашиглахгүй
const PLACEHOLDER_SECRET = "change-this-to-a-long-random-string-in-production";

/** Сул эсвэл жишээ JWT_SECRET-ийг хүлээж авахгүй */
export function isWeakJwtSecret(secret: string | undefined): boolean {
  return !secret || secret.length < 32 || secret === PLACEHOLDER_SECRET;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (isWeakJwtSecret(secret)) {
    // JWT_SECRET байхгүй/сул бол нууц DATABASE_URL-аас үүсгэнэ
    // (middleware.ts-тэй яг ижил аргаар). Production дээр 32+ тэмдэгт
    // санамсаргүй JWT_SECRET тохируулах нь хамгийн зөв.
    console.warn("JWT_SECRET missing or weak; deriving secret from DATABASE_URL.");
    return createHash("sha256")
      .update(process.env.DATABASE_URL ?? "dev")
      .digest("hex");
  }
  return secret!;
}

export async function createAuthToken(user: {
  id: string;
  name: string;
  role?: string;
}) {
  const secret = getJwtSecret();
  const enc = new TextEncoder();

  // HS256 symmetric signature
  return await new SignJWT({ name: user.name, role: user.role ?? "USER" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(enc.encode(secret));
}

export async function verifyAuthToken(token: string) {
  const secret = getJwtSecret();
  const enc = new TextEncoder();
  const { payload } = await jwtVerify(token, enc.encode(secret));

  return {
    userId: payload.sub,
    name: (payload as { name?: string }).name,
    role: (payload as { role?: string }).role ?? "USER",
    exp: payload.exp,
  };
}

export async function getAuthTokenFromCookies() {
  const store = await cookies();
  return store.get(JWT_COOKIE_NAME)?.value ?? null;
}

export function setAuthTokenCookie(res: NextResponse, token: string) {
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(JWT_COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    // 30 days
    maxAge: 60 * 60 * 24 * 30,
  });
}
