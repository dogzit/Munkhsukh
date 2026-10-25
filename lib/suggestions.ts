// Санал хүсэлт хэсэг — бүх хэрэглэгчид нээлттэй
export const SUGGESTIONS_PUBLIC = true;

export function canSuggest(role: string | undefined) {
  return SUGGESTIONS_PUBLIC || role === "ADMIN";
}
