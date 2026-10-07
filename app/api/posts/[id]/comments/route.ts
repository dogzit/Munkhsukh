import prisma from "@/lib/prisma";
import { isAdminFromHeaders } from "@/lib/requireAuth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userName = req.headers.get("x-user-name") ?? "";
    const { id: postId } = await context.params;
    const [comments, post] = await Promise.all([
      prisma.comment.findMany({
        where: { postId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.post.findUnique({ where: { id: postId }, select: { userName: true } }),
    ]);

    // Устгах эрх: сэтгэгдэл бичсэн хүн, постын эзэн, эсвэл админ
    const canModerate =
      (!!userName && post?.userName === userName) || isAdminFromHeaders(req);

    return NextResponse.json(
      comments.map((c) => {
        const mine = !!userName && c.userName === userName;
        return { ...c, mine, canDelete: mine || canModerate };
      }),
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: postId } = await context.params;
    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";

    if (!text || text.length > 500) {
      return NextResponse.json({ error: "Comment must be 1-500 chars" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: { postId, userName, text },
    });

    return NextResponse.json({ ...comment, mine: true, canDelete: true }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
