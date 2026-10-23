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
