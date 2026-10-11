// Чөлөө авах хэсэг — одоохондоо зөвхөн админд харагдана (туршилт).
// Бүх хүнд нээх үед true болгоход л хангалттай.
export const LEAVE_PUBLIC = false;

export const LEAVE_TYPES = [
  { id: "SICK", name: "Өвчтэй", emoji: "🤒", desc: "Эмнэлгийн бичгийн зураг оруулна" },
  { id: "PERSONAL", name: "Чөлөөтэй", emoji: "📝", desc: "Чөлөө авах шалтгаанаа бичнэ" },
] as const;

export type LeaveType = (typeof LEAVE_TYPES)[number]["id"];

export function isLeaveType(v: unknown): v is LeaveType {
  return LEAVE_TYPES.some((t) => t.id === v);
}

/** Чөлөөний хэсгийг ашиглах эрх */
export function canUseLeave(role: string | undefined) {
  return LEAVE_PUBLIC || role === "ADMIN";
}

/** Хүсэлт шийдэх эрх — ангийн багш (туршилтын үед зөвхөн админ) */
export function canDecideLeave(role: string | undefined) {
  return role === "ADMIN" || (LEAVE_PUBLIC && role === "TEACHER");
}
