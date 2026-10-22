import { canPlayGames } from "@/lib/games";
import { gameScoreHandlers } from "@/lib/gameScores";

const h = gameScoreHandlers("2048", canPlayGames);
export const GET = h.GET;
export const POST = h.POST;
