import webpush from "web-push";
import prisma from "@/lib/prisma";

type PushPayload = {
  title: string;
  body?: string;
  href?: string;
};

let configured: boolean | null = null;

function ensureConfigured() {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.VAPID_SUBJECT ||
    (process.env.EMAIL_USER ? `mailto:${process.env.EMAIL_USER}` : "");
  if (!publicKey || !privateKey || !subject) {
    console.warn("[push] VAPID keys тохируулаагүй — push илгээхгүй");
    configured = false;
    return configured;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return configured;
}

async function sendToSubs(
  subs: { id: string; endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload,
) {
  if (!subs.length || !ensureConfigured()) return;
  const data = JSON.stringify(payload);
  const expired: string[] = [];

  await Promise.all(
    subs.map((s) =>
      webpush
        .sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data,
          { TTL: 60 * 60 * 24 },
        )
        .catch((e: { statusCode?: number }) => {
          // 404/410 — утас бүртгэлээ цуцалсан, устгана
          if (e?.statusCode === 404 || e?.statusCode === 410) expired.push(s.id);
          else console.error("[push] send failed:", e);
        }),
    ),
  );

  if (expired.length) {
    await prisma.pushSubscription
      .deleteMany({ where: { id: { in: expired } } })
      .catch(() => {});
  }
}

/** Бүх хэрэглэгчийн утас руу push илгээнэ. Await хийхгүй дуудаж болно. */
export async function pushToAllUsers(
  payload: PushPayload & { exceptUserName?: string },
) {
  try {
    const { exceptUserName, ...rest } = payload;
    const subs = await prisma.pushSubscription.findMany({
      where: exceptUserName ? { NOT: { userName: exceptUserName } } : {},
    });
    await sendToSubs(subs, rest);
  } catch (e) {
    console.error("[push] pushToAllUsers error:", e);
  }
}

/** Нэг хэрэглэгчийн бүх төхөөрөмж рүү push илгээнэ. */
export async function pushToUser(userName: string, payload: PushPayload) {
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { userName } });
    await sendToSubs(subs, payload);
  } catch (e) {
    console.error("[push] pushToUser error:", e);
  }
}
