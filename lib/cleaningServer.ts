import prisma from "@/lib/prisma";
import { pushToUser } from "@/lib/push";
import {
  CLEANING_PUBLIC,
  DEFAULT_GROUPS,
  NOTIFY_HOUR,
  groupIndexFor,
  parseGroups,
  ubNow,
  type Roster,
} from "@/lib/cleaning";

export async function getRoster(): Promise<Roster & { lastNotified: string | null }> {
  const row = await prisma.cleaningRoster.findUnique({ where: { id: "main" } });
  if (!row) {
    return {
      groups: Array.from({ length: DEFAULT_GROUPS }, () => []),
      anchorDate: ubNow().ymd,
      anchorIndex: 0,
      skipWeekends: true,
      lastNotified: null,
    };
  }
  return {
    groups: parseGroups(row.groups),
    anchorDate: row.anchorDate,
    anchorIndex: row.anchorIndex,
    skipWeekends: row.skipWeekends,
    lastNotified: row.lastNotified,
  };
}

/**
 * Өнөөдрийн бүлэгт "цэвэрлэгээтэй" мэдэгдэл явуулна — өдөрт нэг л удаа.
 * Өглөөний NOTIFY_HOUR-оос өмнө, амралтын өдөр, эсвэл хаалттай үед юу ч хийхгүй.
 */
export async function notifyTodayIfNeeded(force = false) {
  if (!CLEANING_PUBLIC && !force) return { sent: 0, reason: "not public" };
  const { ymd, hour } = ubNow();
  if (hour < NOTIFY_HOUR && !force) return { sent: 0, reason: "too early" };

  const r = await getRoster();
  if (r.lastNotified === ymd && !force) return { sent: 0, reason: "already sent" };
  const idx = groupIndexFor(ymd, r);
  if (idx === null) return { sent: 0, reason: "no duty today" };
  const members = r.groups[idx] ?? [];
  if (!members.length) return { sent: 0, reason: "empty group" };

  // Давхар явуулахгүйн тулд эхлээд тэмдэглэнэ (хоёр хүсэлт зэрэг ирсэн ч нэг нь л явуулна)
  const claimed = await prisma.cleaningRoster.updateMany({
    where: force ? { id: "main" } : { id: "main", OR: [{ lastNotified: null }, { lastNotified: { not: ymd } }] },
    data: { lastNotified: ymd },
  });
  if (!claimed.count) return { sent: 0, reason: "already sent" };

  const title = "🧹 Өнөөдөр чи ангийн цэвэрлэгээтэй!";
  const body = `${idx + 1}-р бүлэг: ${members.length} хүн. Хичээлийн дараа ангиа цэвэрлээрэй.`;
  await prisma.notification.createMany({
    data: members.map((userName) => ({ userName, title, body, icon: "🧹", href: "/cleaning" })),
  });
  await Promise.all(members.map((m) => pushToUser(m, { title, body, href: "/cleaning", tag: "cleaning" })));
  return { sent: members.length, reason: "ok" };
}
