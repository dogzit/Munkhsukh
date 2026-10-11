import prisma from "@/lib/prisma";
import { pushToAllUsers, pushToUser } from "@/lib/push";
import { NextRequest, NextResponse, after } from "next/server";

export async function GET() {
  try {
    const messages = (
      await prisma.chatMessage.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
      })
    ).reverse();

    // Хариулсан мессеж сүүлийн 50-аас хуучин байсан ч ишлэл нь харагдана
    const ids = [...new Set(messages.map((m) => m.replyToId).filter((id): id is string => !!id))];
    const originals = ids.length
      ? await prisma.chatMessage.findMany({
          where: { id: { in: ids } },
          select: { id: true, userName: true, text: true, image: true },
        })
      : [];
    const byId = new Map(originals.map((o) => [o.id, o]));

    return NextResponse.json(
      messages.map((m) => ({
        ...m,
        replyTo: m.replyToId
          ? (() => {
              const o = byId.get(m.replyToId);
              return o
                ? { id: o.id, userName: o.userName, text: o.text.slice(0, 80), image: !!o.image }
                : null;
            })()
          : null,
      })),
    );
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
    // Зураг нь заавал /api/upload-аар Cloudinary руу хуулагдсан байх ёстой
    const image =
      typeof body?.image === "string" && body.image.startsWith("https://res.cloudinary.com/")
        ? body.image
        : null;

    if ((!text && !image) || text.length > 500) {
      return NextResponse.json({ error: "Message must be 1-500 chars or an image" }, { status: 400 });
    }

    // Хариулж буй мессеж үнэхээр байгаа эсэхийг шалгана
    const original =
      typeof body?.replyToId === "string"
        ? await prisma.chatMessage.findUnique({
            where: { id: body.replyToId },
            select: { id: true, userName: true },
          })
        : null;

    const msg = await prisma.chatMessage.create({
      data: { userName, text, image, replyToId: original?.id ?? null },
    });

    const preview = text ? text.slice(0, 100) : "📷 Зураг";
    const repliedTo = original && original.userName !== userName ? original.userName : null;

    after(async () => {
      // Хариулт авсан хүнд тусгай мэдэгдэл, бусдад энгийн чатын мэдэгдэл
      if (repliedTo) {
        await pushToUser(repliedTo, {
          title: `💬 ${userName} танд хариулав`,
          body: preview,
          href: "/chat",
          tag: "chat",
        });
      }
      await pushToAllUsers({
        title: `💬 ${userName}`,
        body: preview,
        href: "/chat",
        tag: "chat",
        exceptUserName: repliedTo ? [userName, repliedTo] : userName,
      });
    });

    return NextResponse.json(msg, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
