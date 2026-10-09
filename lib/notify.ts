import prisma from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";

/**
 * Send an email to every user with a registered email address.
 * Non-blocking on the API critical path — call without awaiting.
 * Uses batching to avoid overwhelming the email provider (Resend free tier: 10/s).
 */
export async function notifyAllUsersByEmail(args: {
  subject: string;
  html: string;
  text?: string;
  exceptUserName?: string;
}) {
  try {
    const users = await prisma.user.findMany({
      where: {
        email: { not: null },
        status: "APPROVED",
        ...(args.exceptUserName
          ? { NOT: { name: args.exceptUserName } }
          : {}),
      },
      select: { email: true },
    });

    const recipients = users
      .map((u) => u.email)
      .filter((e): e is string => !!e && e.includes("@"));

    if (!recipients.length) return;

    // Chunk in groups of 5 with 1s spacing to stay under provider limits.
    const chunkSize = 5;
    for (let i = 0; i < recipients.length; i += chunkSize) {
      const chunk = recipients.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map((to) =>
          sendMail({ to, subject: args.subject, html: args.html, text: args.text }).catch((e) =>
            console.error("[notify] send failed for", to, e),
          ),
        ),
      );
      if (i + chunkSize < recipients.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  } catch (e) {
    console.error("[notify] notifyAllUsersByEmail error:", e);
  }
}

export async function notifyUserByEmail(userName: string, args: {
  subject: string;
  html: string;
  text?: string;
}) {
  try {
    const user = await prisma.user.findUnique({
      where: { name: userName },
      select: { email: true },
    });
    if (!user?.email) return;
    await sendMail({ to: user.email, ...args }).catch((e) =>
      console.error("[notify] user send failed:", e),
    );
  } catch (e) {
    console.error("[notify] notifyUserByEmail error:", e);
  }
}

// ── Templates ──

export function homeworkNotifyTemplate(args: {
  subject: string;
  title: string;
  date: Date;
}) {
  const dateStr = args.date.toLocaleDateString("mn-MN");
  const s = `📚 Шинэ даалгавар: ${args.subject}`;
  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width:480px; margin:0 auto; padding:32px; background:#0a0a0f; color:#fff;">
      <h1 style="margin:0 0 8px 0; font-size:22px;">11A Ангийн Апп</h1>
      <p style="color:#a1a1aa; margin:0 0 24px 0;">Шинэ даалгавар нэмэгдлээ</p>
      <div style="background:#18181b; border:1px solid #27272a; border-radius:16px; padding:20px;">
        <p style="color:#71717a; text-transform:uppercase; letter-spacing:2px; font-size:11px; margin:0 0 8px 0; font-weight:700;">${args.subject}</p>
        <p style="font-size:18px; font-weight:800; margin:0 0 12px 0;">${args.title}</p>
        <p style="color:#a1a1aa; font-size:12px; margin:0;">Огноо: ${dateStr}</p>
      </div>
    </div>`;
  const text = `Шинэ даалгавар: ${args.subject} — ${args.title} (${dateStr})`;
  return { subject: s, html, text };
}

export function busApprovedTemplate(args: { seatId: string; ticketUrl?: string }) {
  const s = `11A Ангийн Апп — VIP хүсэлт батлагдлаа (${args.seatId})`;
  const ticketBtn = args.ticketUrl
    ? `<div style="text-align:center; margin-top:16px;">
         <a href="${args.ticketUrl}" style="display:inline-block; background:#3b82f6; color:#fff; text-decoration:none; padding:14px 28px; border-radius:12px; font-weight:800; font-size:13px; letter-spacing:1px; text-transform:uppercase;">Тасалбарыг нээх →</a>
       </div>`
    : "";
  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width:480px; margin:0 auto; padding:32px; background:#0a0a0f; color:#fff;">
      <h1 style="margin:0 0 8px 0; font-size:22px;">11A Ангийн Апп</h1>
      <p style="color:#a1a1aa; margin:0 0 24px 0;">VIP хүсэлт батлагдлаа</p>
      <div style="background:#18181b; border:1px solid #27272a; border-radius:16px; padding:20px; text-align:center;">
        <p style="color:#71717a; text-transform:uppercase; letter-spacing:2px; font-size:11px; margin:0 0 8px 0; font-weight:700;">Суудал</p>
        <p style="font-size:36px; font-weight:900; margin:0;">${args.seatId}</p>
      </div>
      ${ticketBtn}
    </div>`;
  const text = `Таны VIP хүсэлт (${args.seatId}) батлагдлаа. Тасалбар: ${args.ticketUrl || ""}`.trim();
  return { subject: s, html, text };
}

export function postNotifyTemplate(args: { userName: string; text: string }) {
  const preview = args.text.length > 200 ? args.text.slice(0, 200) + "…" : args.text;
  const s = `📰 Шинэ мэдээ: ${args.userName}`;
  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width:480px; margin:0 auto; padding:32px; background:#0a0a0f; color:#fff;">
      <h1 style="margin:0 0 8px 0; font-size:22px;">11A Ангийн Апп</h1>
      <p style="color:#a1a1aa; margin:0 0 24px 0;">Шинэ мэдээ нэмэгдлээ</p>
      <div style="background:#18181b; border:1px solid #27272a; border-radius:16px; padding:20px;">
        <p style="color:#71717a; font-size:11px; margin:0 0 8px 0; font-weight:700; text-transform:uppercase; letter-spacing:2px;">${args.userName}</p>
        <p style="font-size:14px; margin:0; white-space:pre-wrap; line-height:1.5;">${preview}</p>
      </div>
    </div>`;
  const text = `${args.userName}: ${preview}`;
  return { subject: s, html, text };
}
