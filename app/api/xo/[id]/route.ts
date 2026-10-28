import prisma from "@/lib/prisma";
import { emptyCells, markOf, MAX_TOTAL_MOVES, pushCell, TURN_MS, winLine } from "@/lib/xo";
import { getMyRoles } from "@/lib/roles";
import { canStartXo } from "@/lib/games";
import { displayName, xoNotify } from "@/lib/xoNotify";
import { NextResponse, after } from "next/server";
import type { XoGame } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

/** Нүүдлийн хугацаа дуусвал санамсаргүй нүд тавиад ээлж шилжүүлнэ — жинхэнэ XO шиг цаг хязгаартай */
async function applyTimeout(id: string, game: XoGame): Promise<XoGame> {
  if (game.status !== "ACTIVE" || !game.turn || !game.turnExpiresAt || game.turnExpiresAt > new Date()) {
    return game;
  }
  const empty = emptyCells(game.board);
  if (empty.length === 0) return game;
  const timedOut = game.turn;
  const cell = empty[Math.floor(Math.random() * empty.length)];
  const mark = markOf(game, timedOut)!;
  const field = mark === "X" ? "xCells" : "oCells";
  const { cells: newCells, removed } = pushCell(game[field], cell);
  let board = removed !== null ? game.board.slice(0, removed) + "." + game.board.slice(removed + 1) : game.board;
  board = board.slice(0, cell) + mark + board.slice(cell + 1);
  const moveCount = game.moveCount + 1;
  const won = winLine(board) !== null;
  const draw = !won && moveCount >= MAX_TOTAL_MOVES;
  const other = game.challenger === timedOut ? game.opponent : game.challenger;

  const res = await prisma.xoGame.updateMany({
    where: { id, board: game.board, turn: timedOut, status: "ACTIVE", turnExpiresAt: game.turnExpiresAt },
    data: won
      ? { board, [field]: newCells, moveCount, status: "DONE", winner: timedOut, turn: null, turnExpiresAt: null }
      : draw
        ? { board, [field]: newCells, moveCount, status: "DONE", winner: "DRAW", turn: null, turnExpiresAt: null }
        : { board, [field]: newCells, moveCount, turn: other, turnExpiresAt: new Date(Date.now() + TURN_MS) },
  });

  if (res.count) {
    after(async () => {
      if (won) {
        await xoNotify(timedOut, id, "🏆 Чи яллаа!", "Санамсаргүй тавилтаар яллаа 😅");
        await xoNotify(other, id, "😵 Чи хожигдлоо", "Өрсөлдөгч хугацаандаа нүүгээгүй тул санамсаргүй тавилт яллаа.");
      } else if (draw) {
        await xoNotify(timedOut, id, "🤝 Тэнцлээ", "Хугацаа дуусаад санамсаргүй тавилт хийгдлээ.");
        await xoNotify(other, id, "🤝 Тэнцлээ", "Хугацаа дуусаад санамсаргүй тавилт хийгдлээ.");
      } else {
        await xoNotify(timedOut, id, "⏱ Хугацаа дууслаа", "Нүүхгүй байхад санамсаргүй нүд тавигдлаа.");
        await xoNotify(other, id, "⏳ Чиний ээлж!", "Өрсөлдөгч хугацаандаа нүүгээгүй тул санамсаргүй тавилт хийгдлээ.", false);
      }
    });
  }

  return (await prisma.xoGame.findUnique({ where: { id } }))!;
}

/** GET — тулааны төлөв (зөвхөн оролцогчид) */
export async function GET(req: Request, { params }: Ctx) {
  try {
    const me = req.headers.get("x-user-name");
    const { id } = await params;
    let game = await prisma.xoGame.findUnique({ where: { id } });
    if (!game || !me || markOf(game, me) === null) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    game = await applyTimeout(id, game);
    const users = await prisma.user.findMany({
      where: { name: { in: [game.challenger, game.opponent] } },
      select: { name: true, fullName: true, avatar: true },
    });
    const roles = await getMyRoles(req);
    return NextResponse.json({ me, game, users, canStart: canStartXo(roles?.role, me) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** PATCH { action: accept | decline | cancel | move | resign, cell? } */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const me = req.headers.get("x-user-name");
    const { id } = await params;
    let game = await prisma.xoGame.findUnique({ where: { id } });
    if (!game || !me || markOf(game, me) === null) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    game = await applyTimeout(id, game);
    const body = (await req.json().catch(() => null)) as { action?: unknown; cell?: unknown } | null;
    const action = body?.action;
    const other = game.challenger === me ? game.opponent : game.challenger;

    if (action === "accept" || action === "decline") {
      if (game.opponent !== me || game.status !== "PENDING") {
        return NextResponse.json({ error: "Энэ дуудлага хүчингүй болсон" }, { status: 409 });
      }
      const accepted = action === "accept";
      const updated = await prisma.xoGame.update({
        where: { id },
        data: accepted
          ? { status: "ACTIVE", turn: game.challenger, turnExpiresAt: new Date(Date.now() + TURN_MS) }
          : { status: "DECLINED" },
      });
      after(async () => {
        const name = await displayName(me);
        await xoNotify(
          other,
          id,
          accepted ? "✅ Тулаан эхэллээ!" : "🙅 Дуудлагаас татгалзлаа",
          accepted ? `${name} зөвшөөрлөө. Чиний ээлж — X тавь!` : `${name} энэ удаад тоглохгүй гэлээ.`,
        );
      });
      return NextResponse.json(updated);
    }

    if (action === "cancel") {
      if (game.challenger !== me || game.status !== "PENDING") {
        return NextResponse.json({ error: "Цуцлах боломжгүй" }, { status: 409 });
      }
      return NextResponse.json(await prisma.xoGame.update({ where: { id }, data: { status: "CANCELLED" } }));
    }

    if (action === "resign") {
      if (game.status !== "ACTIVE") return NextResponse.json({ error: "Тулаан идэвхгүй" }, { status: 409 });
      const updated = await prisma.xoGame.update({
        where: { id },
        data: { status: "DONE", winner: other, turn: null, turnExpiresAt: null },
      });
      after(async () => {
        const name = await displayName(me);
        await xoNotify(other, id, "🏆 Чи яллаа!", `${name} бууж өглөө.`);
      });
      return NextResponse.json(updated);
    }

    if (action === "move") {
      const cell = body?.cell;
      if (game.status !== "ACTIVE" || game.turn !== me) {
        return NextResponse.json({ error: "Чиний ээлж биш" }, { status: 409 });
      }
      if (typeof cell !== "number" || !Number.isInteger(cell) || cell < 0 || cell > 8 || game.board[cell] !== ".") {
        return NextResponse.json({ error: "Буруу нүүдэл" }, { status: 400 });
      }
      const mark = markOf(game, me)!;
      const field = mark === "X" ? "xCells" : "oCells";
      const { cells: newCells, removed } = pushCell(game[field], cell);
      let board = removed !== null ? game.board.slice(0, removed) + "." + game.board.slice(removed + 1) : game.board;
      board = board.slice(0, cell) + mark + board.slice(cell + 1);
      const moveCount = game.moveCount + 1;
      const won = winLine(board) !== null;
      const draw = !won && moveCount >= MAX_TOTAL_MOVES;

      // Хоёр хүсэлт зэрэг ирвэл зөвхөн нэг нь л хүчинтэй (самбар өөрчлөгдөөгүй үед)
      const res = await prisma.xoGame.updateMany({
        where: { id, board: game.board, turn: me, status: "ACTIVE" },
        data: won
          ? { board, [field]: newCells, moveCount, status: "DONE", winner: me, turn: null, turnExpiresAt: null }
          : draw
            ? { board, [field]: newCells, moveCount, status: "DONE", winner: "DRAW", turn: null, turnExpiresAt: null }
            : { board, [field]: newCells, moveCount, turn: other, turnExpiresAt: new Date(Date.now() + TURN_MS) },
      });
      if (!res.count) return NextResponse.json({ error: "Самбар өөрчлөгдсөн байна" }, { status: 409 });

      after(async () => {
        const name = await displayName(me);
        if (won) await xoNotify(other, id, "😵 Чи хожигдлоо", `${name} яллаа. Дахин тулах уу?`);
        else if (draw) await xoNotify(other, id, "🤝 Тэнцлээ", `${name}-тай тэнцлээ.`);
        // Ээлж бүрийн мэдэгдэл зөвхөн утсанд (хонхны жагсаалтыг дүүргэхгүй)
        else await xoNotify(other, id, "⏳ Чиний ээлж!", `${name} нүүлээ. Одоо ${mark === "X" ? "O" : "X"} тавь.`, false);
      });
      return NextResponse.json(await prisma.xoGame.findUnique({ where: { id } }));
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
