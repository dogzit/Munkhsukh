import nodemailer, { type Transporter } from "nodemailer";

type Attachment = {
  filename: string;
  content: Buffer | string;
  contentType?: string;
};

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Attachment[];
};

let transporterCache: Transporter | null = null;

function getTransporter() {
  if (transporterCache) return transporterCache;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) return null;

  transporterCache = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return transporterCache;
}

function fromAddress() {
  const user = process.env.EMAIL_USER || "";
  const name = process.env.EMAIL_FROM_NAME || "11A Ангийн Апп";
  return `${name} <${user}>`;
}

export async function sendMail({ to, subject, html, text, attachments }: SendArgs) {
  const t = getTransporter();

  if (!t) {
    console.warn(
      "[mailer] EMAIL_USER/EMAIL_PASS not set — printing email to console instead:",
    );
    console.log(`  To:      ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Text:    ${text ?? "(html only)"}`);
    if (attachments?.length) {
      console.log(`  Attach:  ${attachments.map((a) => a.filename).join(", ")}`);
    }
    return { ok: true as const, dev: true as const };
  }

  try {
    const info = await t.sendMail({
      from: fromAddress(),
      to,
      subject,
      html,
      text,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
    console.log("[mailer] sent:", { id: info.messageId, to });
    return { ok: true as const, id: info.messageId };
  } catch (e) {
    console.error("[mailer] send failed:", {
      err: e instanceof Error ? e.message : String(e),
      to,
      subject,
    });
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "unknown error",
    };
  }
}

export function otpEmailTemplate(code: string) {
  const subject = "11A Ангийн Апп — Баталгаажуулах код";
  const text = `Таны email баталгаажуулах код: ${code}\nЭнэ код 10 минутын дараа хүчингүй болно.`;
  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #fff;">
      <h1 style="margin:0 0 8px 0; font-size:22px;">11A Ангийн Апп</h1>
      <p style="color:#a1a1aa; margin:0 0 24px 0;">Email баталгаажуулах код</p>
      <div style="background:#18181b; border:1px solid #27272a; border-radius:16px; padding:24px; text-align:center;">
        <p style="color:#71717a; text-transform:uppercase; letter-spacing:2px; font-size:11px; margin:0 0 8px 0; font-weight:700;">Таны код</p>
        <p style="font-size:42px; letter-spacing:8px; font-weight:900; margin:0; color:#818cf8; font-family:monospace;">${code}</p>
        <p style="color:#71717a; font-size:12px; margin:16px 0 0 0;">10 минутын дараа хүчингүй болно</p>
      </div>
      <p style="color:#52525b; font-size:11px; text-align:center; margin-top:24px;">Энэ email-г та хүсээгүй бол үл тоомсорлоно уу.</p>
    </div>`;
  return { subject, html, text };
}

export function bookingEmailTemplate(args: {
  seatId: string;
  userName: string;
  qrImageUrl: string | null;
  qrDataUrl: string | null;
  ticketUrl?: string;
  status: "APPROVED" | "PENDING";
}) {
  const { seatId, userName, qrImageUrl, qrDataUrl, ticketUrl, status } = args;
  const isPending = status === "PENDING";
  const subject = isPending
    ? `11A Ангийн Апп — Хүсэлт хүлээгдэж байна (${seatId})`
    : `11A Ангийн Апп — Захиалга баталгаажлаа (${seatId})`;
  const statusLine = isPending
    ? "Таны VIP хүсэлт админ хүлээгдэж байна. Батлагдсаны дараа энэ QR ажиллана."
    : "Автобусанд суух үедээ энэ QR кодыг админд үзүүлнэ үү.";
  const text = `${subject}\n\nСуудал: ${seatId}\nЗахиалагч: ${userName}\n${statusLine}`;

  const qrImg = qrImageUrl
    ? `<img src="${qrImageUrl}" alt="QR" width="240" height="240" style="width:240px; height:240px; background:#fff; border-radius:12px; padding:12px; box-sizing:border-box; display:block; margin:0 auto;" />`
    : qrDataUrl
      ? `<img src="${qrDataUrl}" alt="QR" width="240" height="240" style="width:240px; height:240px; background:#fff; border-radius:12px; padding:12px; box-sizing:border-box; display:block; margin:0 auto;" />
         <p style="color:#a1a1aa; font-size:11px; margin:12px 0 0 0;">QR харагдахгүй бол хавсаргасан файлыг нээнэ үү</p>`
      : `<p style="color:#f87171;">QR үүсгэхэд алдаа гарлаа</p>`;

  const ticketButton = ticketUrl
    ? `<div style="text-align:center; margin-top:20px;">
         <a href="${ticketUrl}" style="display:inline-block; background:#3b82f6; color:#fff; text-decoration:none; padding:14px 28px; border-radius:12px; font-weight:800; font-size:13px; letter-spacing:1px; text-transform:uppercase;">
           Тасалбарыг нээх →
         </a>
         <p style="color:#71717a; font-size:11px; margin-top:8px;">QR харагдахгүй бол дээрх линк дээр дарж утсанд нээнэ үү</p>
       </div>`
    : "";

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #fff;">
      <h1 style="margin:0 0 8px 0; font-size:22px;">11A Ангийн Апп</h1>
      <p style="color:#a1a1aa; margin:0 0 24px 0;">${isPending ? "Захиалгын хүсэлт" : "Захиалга баталгаажлаа"}</p>
      <div style="background:#18181b; border:1px solid #27272a; border-radius:16px; padding:24px; text-align:center;">
        <p style="color:#71717a; text-transform:uppercase; letter-spacing:2px; font-size:11px; margin:0 0 8px 0; font-weight:700;">Суудал</p>
        <p style="font-size:36px; font-weight:900; margin:0 0 16px 0; color:#fff;">${seatId}</p>
        ${qrImg}
        <p style="color:#a1a1aa; font-size:12px; margin:16px 0 0 0;">Захиалагч: <b style="color:#fff;">${userName}</b></p>
      </div>
      ${ticketButton}
      <p style="color:#a1a1aa; font-size:13px; margin-top:20px; text-align:center;">${statusLine}</p>
    </div>`;
  return { subject, html, text };
}
