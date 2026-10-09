import prisma from "@/lib/prisma";
import { NextResponse, after } from "next/server";
import { isNonEmptyString } from "@/lib/validation";
import { homeworkNotifyTemplate, notifyAllUsersByEmail } from "@/lib/notify";
import { pushToAllUsers } from "@/lib/push";

type ApiError = { error: string };

function normalizeImages(body: Record<string, unknown>): string[] {
  const out: string[] = [];

  if (Array.isArray(body.images)) {
    for (const v of body.images) {
      if (typeof v === "string" && v.trim()) out.push(v.trim());
    }
  }

  if (typeof body.image === "string" && body.image.trim()) {
    out.push(body.image.trim());
  }

  return Array.from(new Set(out));
}

function ymdRangeToUTC(ymd: string) {
  const start = new Date(`${ymd}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;
  const next = new Date(start);
  next.setUTCDate(next.getUTCDate() + 1);
  return { start, next };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const subject = searchParams.get("subject");
    const date = searchParams.get("date");
    const userName = req.headers.get("x-user-name");

    const where: { subject?: string; date?: { gte: Date; lt: Date } } = {};

    if (subject && subject.trim()) where.subject = subject.trim();
    if (date && date.trim()) {
      const r = ymdRangeToUTC(date.trim());
      if (r) where.date = { gte: r.start, lt: r.next };
    }

    const [items, myChecks] = await Promise.all([
      prisma.hwork.findMany({
        where,
        orderBy: { date: "desc" },
      }),
      userName
        ? prisma.hworkCheck.findMany({
            where: { userName },
            select: { hworkId: true },
          })
        : Promise.resolve([]),
    ]);

    const checkedSet = new Set(myChecks.map((c) => c.hworkId));

    return NextResponse.json(
      items.map((item) => ({ ...item, checked: checkedSet.has(item.id) })),
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, {
      status: 500,
    });
  }
}

export async function POST(req: Request) {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!raw || typeof raw !== "object") {
      return NextResponse.json({ error: "Invalid body" } satisfies ApiError, {
        status: 400,
      });
    }

    const body = raw as Record<string, unknown>;

    const title = body.title;
    const subject = body.subject;
    const date = body.date;

    if (!isNonEmptyString(title)) {
      return NextResponse.json({ error: "title required" } satisfies ApiError, {
        status: 400,
      });
    }
    if (!isNonEmptyString(subject)) {
      return NextResponse.json(
        { error: "subject required" } satisfies ApiError,
        { status: 400 },
      );
    }

    let parsedDate: Date;
    if (typeof date === "string" && date.trim()) {
      const d = new Date(date.trim());
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "invalid date" } satisfies ApiError, {
          status: 400,
        });
      }
      parsedDate = d;
    } else {
      parsedDate = new Date();
    }

    const images = normalizeImages(body);

    const created = await prisma.hwork.create({
      data: {
        title: title.trim(),
        subject: subject.trim(),
        date: parsedDate,
        images,
      },
    });

    // Fire-and-forget email notifications to all students.
    const tpl = homeworkNotifyTemplate({
      subject: created.subject,
      title: created.title,
      date: created.date,
    });
    void notifyAllUsersByEmail(tpl);
    after(() =>
      pushToAllUsers({
        title: `📚 Шинэ даалгавар: ${created.subject}`,
        body: `${created.title} (${created.date.toLocaleDateString("mn-MN")})`,
        href: "/homeWork",
      }),
    );

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, {
      status: 500,
    });
  }
}
