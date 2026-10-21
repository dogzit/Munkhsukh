// Тоглоомын хэсэг — туршилтын үед зөвхөн админд (true болговол бүгдэд нээгдэнэ).
export const GAMES_PUBLIC = false;

export function canPlayGames(role: string | undefined) {
  return GAMES_PUBLIC || role === "ADMIN";
}
