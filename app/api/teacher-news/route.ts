import prisma from "@/lib/prisma";
import { pushToAllUsers } from "@/lib/push";
import { canPostTeacherNews } from "@/lib/roles";
import { isTeacherCategory, teacherCategory } from "@/lib/teacherNews";
import { NextRequest, NextResponse, after } from "next/server";

type ApiError = { error: string };

/**
 * GET /api/teacher-news?category=EVENT|ACTIVITY|PREPARE
 * Бүх хэрэглэгч уншина
 */
export async function GET(req: NextRequest) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) {
      return NextResponse.json({ error: "Unauthorized" } satisfies ApiError, { status: 401 });
    }
    const category = req.nextUrl.searchParams.get("category");

    const posts = await prisma.teacherPost.findMany({
      where: isTeacherCategory(category) ? { category } : undefined,
      take: 50,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { fullName: true, avatar: true } } },
    });

    // Ангилал тус бүрийн тоо
    const grouped = await prisma.teacherPost.groupBy({ by: ["category"], _count: true });
    const counts = Object.fromEntries(grouped.map((g) => [g.category, g._count]));

    return NextResponse.json({
      canPost: await canPostTeacherNews(req),
      counts,
      posts: posts.map(({ user, ...p }) => ({
        ...p,
        authorName: user.fullName || p.userName,
        authorAvatar: user.avatar,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, { status: 500 });
  }
}

/**
 * POST /api/teacher-news  (админ, ангийн багш)
 * Body: { category, title, text, images: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName || !(await canPostTeacherNews(req))) {
      return NextResponse.json(
        { error: "Зөвхөн ангийн багш болон админ мэдээ оруулна" } satisfies ApiError,
        { status: 403 },
      );
    }

    const body = (await req.json().catch(() => null)) as {
      category?: unknown;
      title?: unknown;
      text?: unknown;
      images?: unknown;
    } | null;
    const category = body?.category;
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    // Зургууд /api/upload-аар Cloudinary руу хуулагдсан байх ёстой
    const images = Array.isArray(body?.images)
      ? body.images
          .filter((u): u is string => typeof u === "string" && u.startsWith("https://res.cloudinary.com/"))
          .slice(0, 6)
      : [];

    if (!isTeacherCategory(category)) {
      return NextResponse.json({ error: "Ангилал сонгоно уу" } satisfies ApiError, { status: 400 });
    }
    if (!title || title.length > 120) {
      return NextResponse.json({ error: "Гарчиг 1-120 тэмдэгт байна" } satisfies ApiError, { status: 400 });
    }
    if (text.length > 3000) {
      return NextResponse.json({ error: "Текст 3000 тэмдэгтээс хэтэрсэн" } satisfies ApiError, { status: 400 });
    }

    const post = await prisma.teacherPost.create({
      data: { category, title, text, images, userName },
    });

    const cat = teacherCategory(category);
    after(() =>
      pushToAllUsers({
        title: `${cat?.emoji ?? "📢"} Багшийн мэдээ: ${cat?.name ?? ""}`,
        body: title.slice(0, 100),
        href: `/teacher-news?category=${category}`,
        exceptUserName: userName,
      }),
    );

    return NextResponse.json(post, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, { status: 500 });
  }
}
