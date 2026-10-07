import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { notifyAllUsersByEmail, postNotifyTemplate } from "@/lib/notify";
import { isAdminFromHeaders } from "@/lib/requireAuth";

export async function GET(req: NextRequest) {
  try {
    const userName = req.headers.get("x-user-name") ?? "";
    const admin = isAdminFromHeaders(req);

    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        _count: { select: { likes: true, comments: true } },
        likes: userName ? { where: { userName }, select: { id: true } } : false,
      },
    });

    const result = posts.map((p) => ({
      id: p.id,
      userName: p.userName,
      text: p.text,
      images: p.images,
      createdAt: p.createdAt,
      likeCount: p._count.likes,
      commentCount: p._count.comments,
      liked: p.likes ? p.likes.length > 0 : false,
      mine: !!userName && p.userName === userName,
      canDelete: (!!userName && p.userName === userName) || admin,
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const images = Array.isArray(body?.images)
      ? body.images.filter((u: unknown) => typeof u === "string" && u)
      : [];

    if (!text && images.length === 0) {
      return NextResponse.json({ error: "Text or images required" }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: { userName, text, images },
    });

    if (text) {
      const tpl = postNotifyTemplate({ userName, text });
      void notifyAllUsersByEmail({ ...tpl, exceptUserName: userName });
    }

    return NextResponse.json(post, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
