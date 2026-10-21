// Ангийн цэвэрлэгээний жижүүр — туршилтын үед зөвхөн админд (true бол бүгдэд).
// false үед хүүхдүүдэд мэдэгдэл ч явахгүй.
export const CLEANING_PUBLIC = false;

export const DEFAULT_GROUPS = 8;
export const MAX_GROUPS = 15;
export const MAX_MEMBERS = 6;
// Өглөө энэ цагаас хойш тухайн өдрийн бүлэгт мэдэгдэл явна (Улаанбаатарын цаг)
export const NOTIFY_HOUR = 7;

export type Roster = {
  groups: string[][];
  anchorDate: string;
  anchorIndex: number;
  skipWeekends: boolean;
};

export function canSeeCleaning(role: string | undefined) {
  return CLEANING_PUBLIC || role === "ADMIN";
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Улаанбаатарын цагаар өнөөдрийн огноо, цаг */
export function ubNow(now = new Date()) {
  const ub = new Date(now.getTime() + 8 * 3_600_000);
  return {
    ymd: `${ub.getUTCFullYear()}-${pad(ub.getUTCMonth() + 1)}-${pad(ub.getUTCDate())}`,
    hour: ub.getUTCHours(),
  };
}

function toUTC(ymd: string) {
  return Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10));
}

export function addDays(ymd: string, n: number) {
  const d = new Date(toUTC(ymd) + n * 86_400_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** 0 = ням … 6 = бямба */
export function weekday(ymd: string) {
  return new Date(toUTC(ymd)).getUTCDay();
}

export function isDutyDay(ymd: string, skipWeekends: boolean) {
  if (!skipWeekends) return true;
  const w = weekday(ymd);
  return w !== 0 && w !== 6;
}

/** Тухайн өдөр хэддүгээр бүлэг жижүүрлэх (амралтын өдөр бол null) */
export function groupIndexFor(ymd: string, r: Roster): number | null {
  const n = r.groups.length;
  if (!n || !isDutyDay(ymd, r.skipWeekends)) return null;
  // anchor-оос хойш (эсвэл өмнө) хэдэн жижүүрийн өдөр өнгөрсөн
  let steps = 0;
  if (ymd >= r.anchorDate) {
    // anchor амралтын өдөр бол дараагийн ажлын өдөр anchorIndex болно
    for (let d = r.anchorDate; d < ymd; d = addDays(d, 1)) if (isDutyDay(d, r.skipWeekends)) steps++;
  } else {
    for (let d = ymd; d < r.anchorDate; d = addDays(d, 1)) if (isDutyDay(d, r.skipWeekends)) steps--;
  }
  return (((r.anchorIndex + steps) % n) + n) % n;
}

/** Өнөөдрөөс эхлэн дараагийн жижүүрийн өдрүүд */
export function upcoming(r: Roster, from: string, count: number) {
  const out: { date: string; index: number }[] = [];
  for (let d = from, guard = 0; out.length < count && guard < 60; d = addDays(d, 1), guard++) {
    const i = groupIndexFor(d, r);
    if (i !== null) out.push({ date: d, index: i });
  }
  return out;
}

export function parseGroups(v: unknown): string[][] {
  if (!Array.isArray(v)) return [];
  return v.map((g) =>
    Array.isArray(g) ? g.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim()) : [],
  );
}
