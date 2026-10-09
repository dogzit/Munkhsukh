import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (!q) return NextResponse.json({ users: [], posts: [] });

    // Fetch all users and filter in JS (small dataset for a classroom app)
    const allUsers = await prisma.user.findMany({
      where: { name: { not: "admin" } },
      select: { name: true, avatar: true, bio: true, instagram: true, phone: true, email: true },
    });

    const qLower = q.toLowerCase();
    const users = allUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(qLower) ||
        u.instagram?.toLowerCase().includes(qLower),
    );

    const allPosts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { _count: { select: { likes: true, comments: true } } },
    });

    const posts = allPosts
      .filter(
        (p) =>
          p.text.toLowerCase().includes(qLower) ||
          p.userName.toLowerCase().includes(qLower),
      )
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        userName: p.userName,
        text: p.text,
        images: p.images,
        createdAt: p.createdAt,
        likeCount: p._count.likes,
        commentCount: p._count.comments,
      }));

    return NextResponse.json({ users, posts });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
