import prisma from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { pushToUser } from "@/lib/push";

type SignupUser = {
  name: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
};

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailShell(heading: string, inner: string) {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width:480px; margin:0 auto; padding:32px; background:#0a0a0f; color:#fff;">
      <h1 style="margin:0 0 8px 0; font-size:22px;">11A Ангийн Апп</h1>
      <p style="color:#a1a1aa; margin:0 0 24px 0;">${heading}</p>
      <div style="background:#18181b; border:1px solid #27272a; border-radius:16px; padding:20px;">${inner}</div>
    </div>`;
}

/** Шинэ бүртгэлийн хүсэлтийг бүх админд мэдэгдэнэ (хонх + утас + имэйл). */
export async function notifyAdminsOfSignup(user: SignupUser) {
  try {
    const admins = await prisma.user.findMany({
      where: {
        OR: [{ role: "ADMIN" }, { name: { equals: "admin", mode: "insensitive" } }],
        status: "APPROVED",
      },
      select: { name: true, email: true },
    });
    if (!admins.length) return;

    const who = user.fullName ? `${user.fullName} (@${user.name})` : `@${user.name}`;
    const details = [user.email, user.phone].filter(Boolean).join(" • ");
    const title = "Шинэ бүртгэлийн хүсэлт";

    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userName: a.name,
        title,
        body: details ? `${who} — ${details}` : who,
        icon: "🙋",
        href: "/admin/users",
      })),
    });

    const html = emailShell(
      "Шинэ хэрэглэгч бүртгүүлж, зөвшөөрөл хүлээж байна",
      `<p style="font-size:18px; font-weight:800; margin:0 0 8px 0;">${esc(who)}</p>
       ${user.email ? `<p style="color:#a1a1aa; margin:0 0 4px 0;">✉️ ${esc(user.email)}</p>` : ""}
       ${user.phone ? `<p style="color:#a1a1aa; margin:0;">📞 ${esc(user.phone)}</p>` : ""}
       <p style="color:#71717a; font-size:12px; margin:16px 0 0 0;">Админ → Хэрэглэгчийн эрх хуудаснаас зөвшөөрөх эсвэл татгалзана уу.</p>`,
    );

    await Promise.all(
      admins.flatMap((a) => [
        pushToUser(a.name, { title: `🙋 ${title}`, body: who, href: "/admin/users" }),
        a.email
          ? sendMail({
              to: a.email,
              subject: `🙋 ${title}: ${who}`,
              html,
              text: `${title}: ${who} ${details}`,
            }).catch((e) => console.error("[signup] admin mail failed:", e))
          : Promise.resolve(),
      ]),
    );
  } catch (e) {
    console.error("[signup] notifyAdminsOfSignup error:", e);
  }
}

/** Хүсэлтийн хариуг хэрэглэгчийн имэйл рүү илгээнэ. */
export async function notifySignupDecision(user: SignupUser, approved: boolean) {
  if (!user.email) return;
  const subject = approved
    ? "11A Ангийн Апп — Бүртгэл зөвшөөрөгдлөө ✅"
    : "11A Ангийн Апп — Бүртгэлийн хүсэлт";
  const inner = approved
    ? `<p style="font-size:16px; font-weight:800; margin:0 0 8px 0;">Сайн байна уу, ${esc(user.fullName || user.name)}!</p>
       <p style="color:#a1a1aa; margin:0;">Таны бүртгэлийг админ зөвшөөрлөө. Одоо <b>${esc(user.name)}</b> нэр болон PIN-ээрээ нэвтэрч болно.</p>`
    : `<p style="color:#a1a1aa; margin:0;">Уучлаарай, таны бүртгэлийн хүсэлтийг админ зөвшөөрсөнгүй.</p>`;
  await sendMail({
    to: user.email,
    subject,
    html: emailShell(approved ? "Бүртгэл зөвшөөрөгдлөө" : "Бүртгэлийн хүсэлт", inner),
    text: approved
      ? `Таны бүртгэл зөвшөөрөгдлөө. ${user.name} нэрээрээ нэвтэрнэ үү.`
      : "Таны бүртгэлийн хүсэлтийг админ зөвшөөрсөнгүй.",
  }).catch((e) => console.error("[signup] decision mail failed:", e));
}
