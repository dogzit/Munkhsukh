import prisma from "@/lib/prisma";
import {
  createAuthToken,
  hashPin,
  normalizePin,
  setAuthTokenCookie,
} from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

type ApiError = { error: string };

// Үсэг (кирилл орно), тоо, _ . - ; 2-30 тэмдэгт
const NAME_RE = /^[\p{L}\p{N}_.-]{2,30}$/u;

/**
 * POST /api/profile/username
 * Хэрэглэгчийн нэр солих
 * Body: { newName: string, pin: string }
 */
export async function POST(req: NextRequest) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, {
        status: 401,
      });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const newName = typeof body?.newName === "string" ? body.newName.trim() : "";
    const pin = typeof body?.pin === "string" ? normalizePin(body.pin) : "";

    if (!NAME_RE.test(newName)) {
      return NextResponse.json(
        { error: "Нэр 2-30 тэмдэгт, зөвхөн үсэг, тоо, _ . - байна" } satisfies ApiError,
        { status: 400 },
      );
    }
    if (newName === userName) {
      return NextResponse.json(
        { error: "Шинэ нэр одоогийнхтой адилхан байна" } satisfies ApiError,
        { status: 400 },
      );
    }
    // "admin" нэр админ эрх өгдөг тул энэ нэр рүү/нэрээс солихыг хориглоно
    if (newName.toLowerCase() === "admin" || userName.toLowerCase() === "admin") {
      return NextResponse.json(
        { error: "Энэ нэрийг ашиглах боломжгүй" } satisfies ApiError,
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { name: userName } });
    if (!user) {
      return NextResponse.json({ error: "Хэрэглэгч олдсонгүй" } satisfies ApiError, {
        status: 404,
      });
    }

    if (!pin || hashPin(pin, user.pinSalt) !== user.pinHash) {
      return NextResponse.json({ error: "PIN буруу байна" } satisfies ApiError, {
        status: 401,
      });
    }

    // Том жижиг үсгээр ялгаатай ч адилхан нэрийг зөвшөөрөхгүй
    const taken = await prisma.user.findFirst({
      where: {
        name: { equals: newName, mode: "insensitive" },
        NOT: { id: user.id },
      },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json(
        { error: "Энэ нэр бүртгэлтэй байна" } satisfies ApiError,
        { status: 409 },
      );
    }

    const oldPrefix = `${userName}:`;

    await prisma.$transaction(async (tx) => {
      // Todo, Like, Comment, BusBooking нь FK-ээр (ON UPDATE CASCADE) автоматаар шинэчлэгдэнэ
      await tx.user.update({ where: { id: user.id }, data: { name: newName } });

      // FK-гүй, нэрээ string-ээр хадгалдаг хүснэгтүүд
      await tx.post.updateMany({ where: { userName }, data: { userName: newName } });
      await tx.chatMessage.updateMany({ where: { userName }, data: { userName: newName } });
      await tx.hworkCheck.updateMany({ where: { userName }, data: { userName: newName } });
      await tx.notification.updateMany({ where: { userName }, data: { userName: newName } });
      await tx.emailOtp.updateMany({ where: { userName }, data: { userName: newName } });
      await tx.busBooking.updateMany({ where: { boardedBy: userName }, data: { boardedBy: newName } });

      // Chat reaction-ууд "нэр:emoji" хэлбэртэй
      await tx.$executeRaw`
        UPDATE "ChatMessage"
        SET "reaction" = ARRAY(
          SELECT CASE
            WHEN left(r, ${oldPrefix.length}::int) = ${oldPrefix}::text
              THEN ${newName}::text || ':' || substr(r, ${oldPrefix.length + 1}::int)
            ELSE r
          END
          FROM unnest("reaction") WITH ORDINALITY AS t(r, ord)
          ORDER BY ord
        )
        WHERE EXISTS (
          SELECT 1 FROM unnest("reaction") AS r
          WHERE left(r, ${oldPrefix.length}::int) = ${oldPrefix}::text
        )
      `;
    });

    // JWT дотор нэр байдаг тул шинэ token олгоно
    const token = await createAuthToken({
      id: user.id,
      name: newName,
      role: user.role,
    });
    const res = NextResponse.json({ ok: true, name: newName });
    setAuthTokenCookie(res, token);
    return res;
  } catch (e) {
    const code = (e as { code?: string } | undefined)?.code;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Энэ нэр бүртгэлтэй байна" } satisfies ApiError,
        { status: 409 },
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, {
      status: 500,
    });
  }
}
