import { notifyTodayIfNeeded } from "@/lib/cleaningServer";
import { NextResponse } from "next/server";

/**
 * Vercel Cron өглөө бүр дуудна. Өдөрт нэг л удаа явуулдаг тул
 * давтан дуудсан ч хүүхдүүдэд давхар мэдэгдэл очихгүй.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await notifyTodayIfNeeded();
  return NextResponse.json(result);
}
