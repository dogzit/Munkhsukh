import prisma from "@/lib/prisma";
import { branchName, isValidBranch } from "@/lib/branches";
import { pushToUser } from "@/lib/push";
import { isAdminFromHeaders } from "@/lib/requireAuth";
import { NextRequest, NextResponse, after } from "next/server";

type ApiError = { error: string };

/**
 * GET /api/branch/posts?branch=N
 * Салааны нийтлэлүүд — зөвхөн тухайн салааныхан болон админ харна
 */
export async function GET(req: NextRequest) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, { status: 401 });
    }

    const me = await prisma.user.findUnique({ where: { name: userName }, select: { branch: true } });
    const requested = Number(req.nextUrl.searchParams.get("branch") ?? me?.branch);
    if (!isValidBranch(requested)) {
      return NextResponse.json({ error: "branch required" } satisfies ApiError, { status: 400 });
    }
    if (requested !== me?.branch && !isAdminFromHeaders(req)) {
      return NextResponse.json(
        { error: "Зөвхөн өөрийн салааны хэсгийг харна" } satisfies ApiError,
        { status: 403 },
      );
    }

    const posts = await prisma.branchPost.findMany({
      where: { branch: requested },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { fullName: true, avatar: true } } },
    });

    return NextResponse.json(
      posts.map((p) => ({
        id: p.id,
        userName: p.userName,
        fullName: p.user.fullName,
        avatar: p.user.avatar,
        text: p.text,
        images: p.images,
        checkedBy: p.checkedBy,
        checkedAt: p.checkedAt,
        createdAt: p.createdAt,
      })),
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, { status: 500 });
  }
}

/**
 * POST /api/branch/posts
 * Body: { text, images: string[] } — өөрийн салаа руу нийтэлнэ
 */
export async function POST(req: NextRequest) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, { status: 401 });
    }

    const me = await prisma.user.findUnique({ where: { name: userName }, select: { branch: true } });
    const branch = me?.branch;
    if (!isValidBranch(branch)) {
      return NextResponse.json({ error: "Эхлээд салаагаа сонгоно уу" } satisfies ApiError, {
        status: 400,
      });
    }

    const body = (await req.json().catch(() => null)) as {
      text?: unknown;
      images?: unknown;
    } | null;
    const text = typeof body?.text === "string" ? body.text.trim().slice(0, 2000) : "";
    const images = Array.isArray(body?.images)
      ? body.images
          .filter(
            (u): u is string =>
              typeof u === "string" && u.startsWith("https://res.cloudinary.com/"),
          )
          .slice(0, 6)
      : [];

    if (!text && images.length === 0) {
      return NextResponse.json({ error: "Тайлбар эсвэл зураг оруулна уу" } satisfies ApiError, {
        status: 400,
      });
    }

    const post = await prisma.branchPost.create({
      data: { branch, userName, text, images },
    });

    // Салааныхандаа утсаар мэдэгдэнэ
    after(async () => {
      const members = await prisma.user.findMany({
        where: { branch, status: "APPROVED", NOT: { name: userName } },
        select: { name: true },
      });
      await Promise.all(
        members.map((m) =>
          pushToUser(m.name, {
            title: `📝 ${branchName(branch)}: ${userName}`,
            body: text ? (text.length > 120 ? text.slice(0, 120) + "…" : text) : "📷 Зураг нийтэллээ",
            href: "/branch",
          }),
        ),
      );
    });

    return NextResponse.json(post, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, { status: 500 });
  }
}
