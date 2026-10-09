import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_COOKIE_NAME = "auth_jwt";

/**
 * Web Crypto API ашиглан SHA-256 hash үүсгэх функц.
 * Энэ нь Edge Runtime дээр алдаагүй ажиллана.
 */
async function generateHash(message: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

async function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Хэрэв JWT_SECRET байхгүй бол DATABASE_URL-аас hash үүсгэж ашиглана
    return await generateHash(process.env.DATABASE_URL ?? "dev");
  }
  return secret;
}

async function verifyToken(token: string) {
  try {
    const secret = await getJwtSecret();
    const enc = new TextEncoder();
    // jose сан нь Edge Runtime дээр ажиллахад зориулагдсан тул зүгээр
    const { payload } = await jwtVerify(token, enc.encode(secret));
    return payload;
  } catch (error) {
    return null;
  }
}

const PUBLIC_API = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/auth/forgot-pin",
  "/api/qr/",
];
const PUBLIC_PAGES = [
  "/auth/login",
  "/auth/signup",
  "/sw.js",
  "/manifest.webmanifest",
];
const PUBLIC_PAGE_PREFIXES = ["/bus/ticket/"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_API.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    const token = req.cookies.get(JWT_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const res = NextResponse.next();
    res.headers.set("x-user-id", String(payload.sub ?? ""));
    res.headers.set(
      "x-user-name",
      String((payload as Record<string, unknown>).name ?? ""),
    );
    res.headers.set(
      "x-user-role",
      String((payload as Record<string, unknown>).role ?? "USER"),
    );
    return res;
  }

  if (PUBLIC_PAGE_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (!PUBLIC_PAGES.includes(pathname)) {
    const token = req.cookies.get(JWT_COOKIE_NAME)?.value;
    if (!token) {
      const loginUrl = new URL("/auth/login", req.url);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyToken(token);
    if (!payload) {
      const loginUrl = new URL("/auth/login", req.url);
      const res = NextResponse.redirect(loginUrl);
      res.cookies.set(JWT_COOKIE_NAME, "", { maxAge: 0, path: "/" });
      return res;
    }

    const userName = String((payload as Record<string, unknown>).name ?? "");
    const role = String(
      (payload as Record<string, unknown>).role ?? "USER",
    );
    if (
      pathname.startsWith("/admin") &&
      role !== "ADMIN" &&
      userName.toLowerCase() !== "admin"
    ) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
