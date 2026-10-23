// Тоглоомын хэсэг — бүх хэрэглэгчид нээлттэй (false бол зөвхөн админ).
export const GAMES_PUBLIC = true;

export function canPlayGames(role: string | undefined) {
  return GAMES_PUBLIC || role === "ADMIN";
}

// Админ түр хаасан үед энэ цаг хүртэл тоглох боломжгүй (Улаанбаатарын цаг, UTC+8).
// Хаахгүй бол null болгоно.
export const GAMES_CLOSED_UNTIL: string | null = "2026-10-21T13:30:00+08:00";

/** Одоо хаалттай эсэх — хаалттай бол нээгдэх цагийг (ms) буцаана */
export function gamesClosedUntil(now = Date.now()): number | null {
  if (!GAMES_CLOSED_UNTIL) return null;
  const until = new Date(GAMES_CLOSED_UNTIL).getTime();
  return now < until ? until : null;
}

// BLOCK!!! — бүх хэрэглэгчид нээлттэй (false бол зөвхөн админ).
export const BLOCK_PUBLIC = true;

export function canPlayBlock(role: string | undefined) {
  return BLOCK_PUBLIC || role === "ADMIN";
}

// MASHIN — бүх хэрэглэгчид нээлттэй (false бол зөвхөн админ).
export const CAR_PUBLIC = true;

export function canPlayCar(role: string | undefined) {
  return CAR_PUBLIC || role === "ADMIN";
}
