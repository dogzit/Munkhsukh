import prisma from "@/lib/prisma";
import { canManageClass } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";

/**
 * DELETE /api/posts/:id
 * Өөрийн нийтлэлийг устгана (админ, ангийн дарга бүгдийг устгаж болно).
 * Like, сэтгэгдэл нь cascade-аар хамт устна.
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;

    const post = await prisma.post.findUnique({ where: { id }, select: { userName: true } });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (post.userName !== userName && !(await canManageClass(req))) {
      return NextResponse.json({ error: "Зөвхөн өөрийн нийтлэлийг устгана" }, { status: 403 });
    }

    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
