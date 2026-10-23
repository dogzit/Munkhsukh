import { canPlayCar } from "@/lib/games";
import { gameScoreHandlers } from "@/lib/gameScores";

// bestTile — цуглуулсан зоосны тоо
const h = gameScoreHandlers("car-girl", canPlayCar);
export const GET = h.GET;
export const POST = h.POST;
