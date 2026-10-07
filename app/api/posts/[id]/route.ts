import prisma from "@/lib/prisma";
import { isAdminFromHeaders } from "@/lib/requireAuth";
import { NextRequest, NextResponse } from "next/server";

// Edit post text (only own posts)
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (post.userName !== userName) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Зураггүй пост хоосон текстгүй байх ёстой
    if (!text && post.images.length === 0) {
      return NextResponse.json({ error: "Text or images required" }, { status: 400 });
    }

    const updated = await prisma.post.update({
      where: { id },
      data: { text },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Delete post (own posts or admin)
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (post.userName !== userName && !isAdminFromHeaders(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Like, Comment нь onDelete: Cascade-аар хамт устна
    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
