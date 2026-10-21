import { getMyRoles } from "@/lib/roles";
import { pushToUser } from "@/lib/push";
import { NextResponse } from "next/server";

/** POST — админ өөртөө туршилтын мэдэгдэл явуулна (хүүхдүүдэд явахгүй) */
export async function POST(req: Request) {
  const me = await getMyRoles(req);
  const userName = req.headers.get("x-user-name");
  if (me?.role !== "ADMIN" || !userName) {
    return NextResponse.json({ error: "Зөвхөн админ" }, { status: 403 });
  }
  await pushToUser(userName, {
    title: "🧹 Өнөөдөр чи ангийн цэвэрлэгээтэй!",
    body: "Туршилтын мэдэгдэл — хүүхдүүдэд яг ингэж ирнэ.",
    href: "/cleaning",
    tag: "cleaning",
  });
  return NextResponse.json({ ok: true });
}
