import { canPlayBlock } from "@/lib/games";
import { gameScoreHandlers } from "@/lib/gameScores";

const h = gameScoreHandlers("block", canPlayBlock);
export const GET = h.GET;
export const POST = h.POST;
