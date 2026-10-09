import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const messages = await prisma.chatMessage.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(messages.reverse());
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
    const replyToId = typeof body?.replyToId === "string" ? body.replyToId : null;
    // Зураг нь заавал /api/upload-аар Cloudinary руу хуулагдсан байх ёстой
    const image =
      typeof body?.image === "string" && body.image.startsWith("https://res.cloudinary.com/")
        ? body.image
        : null;

    if ((!text && !image) || text.length > 500) {
      return NextResponse.json({ error: "Message must be 1-500 chars or an image" }, { status: 400 });
    }

    const msg = await prisma.chatMessage.create({
      data: { userName, text, image, replyToId },
    });

    return NextResponse.json(msg, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
