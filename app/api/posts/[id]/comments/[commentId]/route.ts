import prisma from "@/lib/prisma";
import { isAdminFromHeaders } from "@/lib/requireAuth";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string; commentId: string }> };

// Edit comment (only own comments)
export async function PATCH(req: NextRequest, context: Params) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: postId, commentId } = await context.params;
    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";

    if (!text || text.length > 500) {
      return NextResponse.json({ error: "Comment must be 1-500 chars" }, { status: 400 });
    }

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.postId !== postId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (comment.userName !== userName) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { text },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Delete comment (comment author, post author, or admin)
export async function DELETE(req: NextRequest, context: Params) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: postId, commentId } = await context.params;
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: { select: { userName: true } } },
    });
    if (!comment || comment.postId !== postId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const allowed =
      comment.userName === userName ||
      comment.post.userName === userName ||
      isAdminFromHeaders(req);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.comment.delete({ where: { id: commentId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
