import prisma from "@/lib/prisma";
import { getMyRoles } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";

/**
 * DELETE /api/teacher-news/:id
 * Оруулсан багш өөрөө эсвэл админ устгана
 */
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const userName = req.headers.get("x-user-name");
    const me = await getMyRoles(req);
    if (!userName || !me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const post = await prisma.teacherPost.findUnique({ where: { id }, select: { userName: true } });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwnerTeacher = post.userName === userName && me.role === "TEACHER";
    if (!isOwnerTeacher && me.role !== "ADMIN") {
      return NextResponse.json({ error: "Устгах эрхгүй" }, { status: 403 });
    }

    await prisma.teacherPost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
