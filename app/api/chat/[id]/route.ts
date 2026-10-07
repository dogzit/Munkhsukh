import prisma from "@/lib/prisma";
import { isAdminFromHeaders } from "@/lib/requireAuth";
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

    // Only own messages or admin can delete
    if (msg.userName !== userName && !isAdminFromHeaders(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.chatMessage.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Edit own message ({ text }) or react to message ({ emoji })
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userName = req.headers.get("x-user-name");
    if (!userName) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const body = await req.json();

    if (body?.text !== undefined) {
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!text || text.length > 500) {
        return NextResponse.json({ error: "Message must be 1-500 chars" }, { status: 400 });
      }

      const msg = await prisma.chatMessage.findUnique({ where: { id } });
      if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (msg.userName !== userName) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const result = await prisma.chatMessage.update({ where: { id }, data: { text } });
      return NextResponse.json(result);
    }

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
