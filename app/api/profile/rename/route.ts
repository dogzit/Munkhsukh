import prisma from "@/lib/prisma";
import {
  createAuthToken,
  hashPin,
  isValidPin,
  normalizePin,
  setAuthTokenCookie,
} from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

type ApiError = { error: string };

// Үсэг (кирилл/латин), тоо, цэг, доогуур зураас, зураас — 2-30 тэмдэгт
const NAME_RE = /^[\p{L}\p{N}._-]{2,30}$/u;

/**
 * POST /api/profile/rename
 * Body: { newName: string, pin: string }
 * Хэрэглэгчийн нэр (нэвтрэх нэр)-ийг солино. Нэр нь олон хүснэгтэд
 * текстээр хадгалагддаг тул бүгдийг нэг transaction-д шинэчилнэ.
 * Гадаад түлхүүртэй (Todo, Like, Comment, BusBooking, PushSubscription,
 * BranchPost) хүснэгтүүд ON UPDATE CASCADE-аар автоматаар шинэчлэгдэнэ.
 */
export async function POST(req: NextRequest) {
  try {
    const oldName = req.headers.get("x-user-name");
    if (!oldName) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as {
      newName?: unknown;
      pin?: unknown;
    } | null;
    const newName = typeof body?.newName === "string" ? body.newName.trim() : "";
    const pin = body?.pin;

    if (!NAME_RE.test(newName)) {
      return NextResponse.json(
        {
          error: "Нэр 2-30 тэмдэгт, зөвхөн үсэг, тоо, цэг, доогуур зураас (_) болон зураас (-) байна",
        } satisfies ApiError,
        { status: 400 },
      );
    }
    if (newName.toLowerCase() === "admin" || oldName.toLowerCase() === "admin") {
      return NextResponse.json({ error: "Энэ нэрийг ашиглах боломжгүй" } satisfies ApiError, {
        status: 400,
      });
    }
    if (newName === oldName) {
      return NextResponse.json({ error: "Шинэ нэр одоогийнхтой ижил байна" } satisfies ApiError, {
        status: 400,
      });
    }
    if (!isValidPin(pin)) {
      return NextResponse.json({ error: "PIN 4 эсвэл 6 оронтой" } satisfies ApiError, {
        status: 400,
      });
    }

    const user = await prisma.user.findUnique({ where: { name: oldName } });
    if (!user) {
      return NextResponse.json({ error: "Not found" } satisfies ApiError, { status: 404 });
    }
    if (hashPin(normalizePin(pin), user.pinSalt) !== user.pinHash) {
      return NextResponse.json({ error: "PIN буруу байна" } satisfies ApiError, { status: 401 });
    }

    // Том жижиг үсгээс үл хамааран давхардахгүй (өөрийн нэрийн үсгийг солихыг зөвшөөрнө)
    const taken = await prisma.user.findFirst({
      where: { name: { equals: newName, mode: "insensitive" }, NOT: { id: user.id } },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json({ error: "Энэ нэрийг өөр хүн ашиглаж байна" } satisfies ApiError, {
        status: 409,
      });
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { name: newName } }),
      prisma.post.updateMany({ where: { userName: oldName }, data: { userName: newName } }),
      prisma.chatMessage.updateMany({ where: { userName: oldName }, data: { userName: newName } }),
      prisma.hworkCheck.updateMany({ where: { userName: oldName }, data: { userName: newName } }),
      prisma.notification.updateMany({ where: { userName: oldName }, data: { userName: newName } }),
      prisma.emailOtp.updateMany({ where: { userName: oldName }, data: { userName: newName } }),
      prisma.branchPost.updateMany({ where: { checkedBy: oldName }, data: { checkedBy: newName } }),
      prisma.busBooking.updateMany({ where: { boardedBy: oldName }, data: { boardedBy: newName } }),
      // Жижүүрийн жагсаалт дахь нэр
      prisma.$executeRaw`UPDATE "DutySchedule" SET "names" = array_replace("names", ${oldName}, ${newName}) WHERE ${oldName} = ANY("names")`,
      // Чатын reaction: "нэр:emoji"
      // (LIKE-ийн оронд left() — нэрэнд "_" байж болох тул)
      prisma.$executeRaw`UPDATE "ChatMessage" SET "reaction" = ARRAY(
          SELECT CASE WHEN left(r, ${oldName.length + 1}) = ${oldName + ":"}
            THEN ${newName} || substr(r, ${oldName.length + 1}) ELSE r END
          FROM unnest("reaction") WITH ORDINALITY AS t(r, i) ORDER BY i
        ) WHERE EXISTS (
          SELECT 1 FROM unnest("reaction") AS r WHERE left(r, ${oldName.length + 1}) = ${oldName + ":"}
        )`,
    ]);

    // Шинэ нэртэй token олгоно (хуучин token дээр хуучин нэр бий)
    const token = await createAuthToken({ id: user.id, name: newName, role: user.role });
    const res = NextResponse.json({ ok: true, name: newName });
    setAuthTokenCookie(res, token);
    return res;
  } catch (e) {
    const code = (e as { code?: string } | undefined)?.code;
    if (code === "P2002") {
      return NextResponse.json({ error: "Энэ нэрийг өөр хүн ашиглаж байна" } satisfies ApiError, {
        status: 409,
      });
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, { status: 500 });
  }
}
