// X O тоглоомын дүрэм — сервер, хөтөч хоёулаа ашиглана

export const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/** Ялсан мөр (байхгүй бол null) */
export function winLine(board: string): number[] | null {
  for (const l of LINES) {
    const [a, b, c] = l;
    if (board[a] !== "." && board[a] === board[b] && board[a] === board[c]) return l;
  }
  return null;
}

export function isFull(board: string) {
  return !board.includes(".");
}

/** Тухайн хүн X эсвэл O аль нь вэ */
export function markOf(g: { challenger: string; opponent: string }, userName: string) {
  return g.challenger === userName ? "X" : g.opponent === userName ? "O" : null;
}

// Жинхэнэ X O шиг нүүдэл бүрт цаг хязгаартай — удаан бодоод дандаа тэнцэхээс сэргийлнэ
export const TURN_MS = 12_000;

export function emptyCells(board: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < board.length; i++) if (board[i] === ".") out.push(i);
  return out;
}

// Нэг тоглогч самбар дээр дандаа тэнцэхээс сэргийлэхийн тулд нэгэн зэрэг ихдээ 3 тэмдэгтэй
// (хуучин тавьсан тэмдэг нь шинээр тавих үед арилна — "дараалсан" тоглоом)
export const MAX_MARKS_PER_PLAYER = 3;
// Онол дээр мөчлөгт орсон тохиолдолд тулаан дуусахгүй болохоос сэргийлэх хамгаалалт
export const MAX_TOTAL_MOVES = 30;

/** Тэмдгийн дараалалд (жишээ нь "358") шинэ нүд нэмнэ; дүүрсэн бол хамгийн хуучин нь арилна */
export function pushCell(cells: string, cell: number): { cells: string; removed: number | null } {
  const arr = cells.split("").map(Number);
  let removed: number | null = null;
  if (arr.length >= MAX_MARKS_PER_PLAYER) removed = arr.shift()!;
  arr.push(cell);
  return { cells: arr.join(""), removed };
}
