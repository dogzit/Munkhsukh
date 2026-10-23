import prisma from "@/lib/prisma";
import { pushToUser } from "@/lib/push";

/** X O-ийн мэдэгдэл — bell=true бол хонхны жагсаалтад ч хадгална */
export async function xoNotify(
  userName: string,
  gameId: string,
  title: string,
  body: string,
  bell = true,
) {
  const href = `/xo/${gameId}`;
  try {
    if (bell) {
      await prisma.notification.create({ data: { userName, title, body, icon: "⚔️", href } });
    }
    // Нэг тулааны мэдэгдлүүд нэг нэгнээ орлоно (овоорохгүй)
    await pushToUser(userName, { title, body, href, tag: `xo-${gameId}` });
  } catch (e) {
    console.error("[xo] notify error", e);
  }
}

export async function displayName(userName: string) {
  const u = await prisma.user.findUnique({ where: { name: userName }, select: { fullName: true } });
  return u?.fullName || userName;
}
