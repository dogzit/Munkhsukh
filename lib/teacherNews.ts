// Ангийн багшийн мэдээний 3 ангилал
export const TEACHER_CATEGORIES = [
  { id: "EVENT", name: "Сургуулийн үйл ажиллагаа", short: "Сургууль", emoji: "🏫", desc: "Удахгүй болох үйл ажиллагаа" },
  { id: "ACTIVITY", name: "Ангийн үйл ажиллагаа", short: "Анги", emoji: "🎯", desc: "Ангиараа хийх зүйлс" },
  { id: "PREPARE", name: "Бэлдэх зүйлс", short: "Бэлдэх", emoji: "🎒", desc: "Хүүхэд бүрийн бэлдэх зүйлс" },
] as const;

export type TeacherCategory = (typeof TEACHER_CATEGORIES)[number]["id"];

export function isTeacherCategory(v: unknown): v is TeacherCategory {
  return TEACHER_CATEGORIES.some((c) => c.id === v);
}

export function teacherCategory(id: string) {
  return TEACHER_CATEGORIES.find((c) => c.id === id);
}
