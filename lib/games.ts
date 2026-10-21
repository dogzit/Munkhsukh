// Тоглоомын хэсэг — бүх хэрэглэгчид нээлттэй (false бол зөвхөн админ).
export const GAMES_PUBLIC = true;

export function canPlayGames(role: string | undefined) {
  return GAMES_PUBLIC || role === "ADMIN";
}
