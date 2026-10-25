import prisma from "@/lib/prisma";
import { getMyRoles } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/suggestions/:id { status?, adminNote? } — зөвхөн админ
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const roles = await getMyRoles(req);
    if (roles?.role !== "ADMIN") return NextResponse.json({ error: "Зөвхөн админ" }, { status: 403 });

    const { id } = await params;
    const body = (await req.json().catch(() => null)) as { status?: unknown; adminNote?: unknown } | null;
    const data: { status?: string; adminNote?: string | null } = {};
    if (typeof body?.status === "string" && ["NEW", "SEEN", "DONE"].includes(body.status)) {
      data.status = body.status;
    }
    if (typeof body?.adminNote === "string") data.adminNote = body.adminNote.trim() || null;
    if (!Object.keys(data).length) return NextResponse.json({ error: "Юу ч өөрчлөгдөөгүй" }, { status: 400 });

    const updated = await prisma.suggestion.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/suggestions/:id — зохиогч (шинэ үедээ) эсвэл админ устгана
 */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const me = req.headers.get("x-user-name");
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const roles = await getMyRoles(req);
    const { id } = await params;
    const item = await prisma.suggestion.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "Олдсонгүй" }, { status: 404 });
    const isAdminUser = roles?.role === "ADMIN";
    if (!isAdminUser && (item.userName !== me || item.status !== "NEW")) {
      return NextResponse.json({ error: "Устгах боломжгүй" }, { status: 403 });
    }
    await prisma.suggestion.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
