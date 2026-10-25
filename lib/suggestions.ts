// Санал хүсэлт хэсэг — эхлээд зөвхөн админд, дараа нь нээлттэй болгоно
export const SUGGESTIONS_PUBLIC = false;

export function canSuggest(role: string | undefined) {
  return SUGGESTIONS_PUBLIC || role === "ADMIN";
}
