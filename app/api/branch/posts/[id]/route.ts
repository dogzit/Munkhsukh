import prisma from "@/lib/prisma";
import { isAdminFromHeaders } from "@/lib/requireAuth";
import { getMyRoles } from "@/lib/roles";
import { pushToUser } from "@/lib/push";
import { NextRequest, NextResponse, after } from "next/server";

/**
 * DELETE /api/branch/posts/:id
 * Өөрийн нийтлэлийг устгана (админ бүгдийг устгаж болно)
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const post = await prisma.branchPost.findUnique({ where: { id }, select: { userName: true } });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (post.userName !== userName && !isAdminFromHeaders(req)) {
      return NextResponse.json({ error: "Зөвхөн өөрийн нийтлэлийг устгана" }, { status: 403 });
    }

    await prisma.branchPost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/branch/posts/:id
 * Body: { checked: boolean }
 * Салааны дарга өөрийн салааныхны даалгаврыг шалгасан гэж тэмдэглэнэ.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const roles = await getMyRoles(req);
    if (!roles) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userName = req.headers.get("x-user-name")!;

    const { id } = await context.params;
    const body = (await req.json().catch(() => null)) as { checked?: unknown } | null;
    if (typeof body?.checked !== "boolean") {
      return NextResponse.json({ error: "checked must be boolean" }, { status: 400 });
    }

    const post = await prisma.branchPost.findUnique({
      where: { id },
      select: { branch: true, userName: true, text: true },
    });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isBranchLeader = roles.branchLeader && roles.branch === post.branch;
    if (!isBranchLeader && roles.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Зөвхөн тухайн салааны дарга шалгана" },
        { status: 403 },
      );
    }

    const updated = await prisma.branchPost.update({
      where: { id },
      data: body.checked
        ? { checkedBy: userName, checkedAt: new Date() }
        : { checkedBy: null, checkedAt: null },
      select: { id: true, checkedBy: true, checkedAt: true },
    });

    // Даалгавар тавьсан хүнд мэдэгдэнэ
    if (body.checked && post.userName !== userName) {
      const preview = post.text ? `"${post.text.slice(0, 60)}${post.text.length > 60 ? "…" : ""}"` : "Таны зурагтай даалгавар";
      await prisma.notification.create({
        data: {
          userName: post.userName,
          title: "Даалгавар шалгагдлаа",
          body: `${userName} шалгалаа: ${preview}`,
          icon: "✅",
          href: "/branch",
        },
      });
      after(() =>
        pushToUser(post.userName, {
          title: "✅ Даалгавар шалгагдлаа",
          body: `${userName} таны даалгаврыг шалгалаа`,
          href: "/branch",
        }),
      );
    }

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
