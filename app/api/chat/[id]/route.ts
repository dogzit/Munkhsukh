import prisma from "@/lib/prisma";
import { canManageClass } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";

// Delete message (only own messages)
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const msg = await prisma.chatMessage.findUnique({ where: { id } });

    if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Only own messages, admin or class leader can delete
    if (msg.userName !== userName && !(await canManageClass(req))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.chatMessage.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// React to message
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const body = await req.json();
    const emoji = typeof body?.emoji === "string" ? body.emoji.trim() : "";

    if (!emoji) return NextResponse.json({ error: "emoji required" }, { status: 400 });

    const msg = await prisma.chatMessage.findUnique({ where: { id } });
    if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // One reaction per user: remove any existing reaction from this user first
    const reactions = msg.reaction || [];
    const withoutUser = reactions.filter((r) => !r.startsWith(`${userName}:`));
    const key = `${userName}:${emoji}`;
    // If same emoji → remove (toggle off), otherwise → set new one
    const updated = reactions.includes(key)
      ? withoutUser
      : [...withoutUser, key];

    const result = await prisma.chatMessage.update({
      where: { id },
      data: { reaction: updated },
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
