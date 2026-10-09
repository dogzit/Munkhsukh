import prisma from "@/lib/prisma";
import { canManageClass } from "@/lib/roles";
import { NextResponse } from "next/server";
import { isNonEmptyString } from "@/lib/validation";

type ApiError = { error: string };

function isStringArray(x: unknown): x is string[] {
  return (
    Array.isArray(x) &&
    x.every((v) => typeof v === "string" && v.trim().length > 0)
  );
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const item = await prisma.hwork.findUnique({ where: { id } });
    if (!item)
      return NextResponse.json({ error: "Not found" } satisfies ApiError, {
        status: 404,
      });
    return NextResponse.json(item);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, {
      status: 500,
    });
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await canManageClass(req))) {
      return NextResponse.json(
        { error: "Зөвхөн админ эсвэл ангийн дарга" } satisfies ApiError,
        { status: 403 },
      );
    }
    const { id } = await context.params;

    const raw: unknown = await req.json().catch(() => null);
    if (!raw || typeof raw !== "object") {
      return NextResponse.json({ error: "Invalid body" } satisfies ApiError, {
        status: 400,
      });
    }

    const body = raw as Record<string, unknown>;

    const data: {
      title?: string;
      subject?: string;
      images?: string[];
      date?: Date;
    } = {};

    if (body.title !== undefined) {
      if (!isNonEmptyString(body.title)) {
        return NextResponse.json(
          { error: "Invalid title" } satisfies ApiError,
          { status: 400 },
        );
      }
      data.title = body.title.trim();
    }

    if (body.subject !== undefined) {
      if (!isNonEmptyString(body.subject)) {
        return NextResponse.json(
          { error: "Invalid subject" } satisfies ApiError,
          { status: 400 },
        );
      }
      data.subject = body.subject.trim();
    }

    if (body.images !== undefined) {
      if (body.images === null) {
        data.images = [];
      } else if (isStringArray(body.images)) {
        data.images = body.images.map((s) => s.trim());
      } else {
        return NextResponse.json(
          { error: "Invalid images" } satisfies ApiError,
          { status: 400 },
        );
      }
    }

    if (body.date !== undefined) {
      if (typeof body.date !== "string" || !body.date.trim()) {
        return NextResponse.json({ error: "Invalid date" } satisfies ApiError, {
          status: 400,
        });
      }
      const d = new Date(body.date);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Invalid date" } satisfies ApiError, {
          status: 400,
        });
      }
      data.date = d;
    }

    const updated = await prisma.hwork.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, {
      status: 500,
    });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await canManageClass(req))) {
      return NextResponse.json(
        { error: "Зөвхөн админ эсвэл ангийн дарга" } satisfies ApiError,
        { status: 403 },
      );
    }
    const { id } = await context.params;
    await prisma.hwork.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" } satisfies ApiError, {
      status: 500,
    });
  }
}
