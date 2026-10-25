// BLOCK!!! тоглоомын дүрэм — React-аас хамааралгүй цэвэр функцууд

export const COLS = 10;
export const ROWS = 20;

export type Kind = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export const KINDS: Kind[] = ["I", "O", "T", "S", "Z", "J", "L"];

export const SHAPES: Record<Kind, number[][]> = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
};

// Дүрс бүр өөрийн энгийн тод өнгөтэй
export const COLORS: Record<Kind, string> = {
  I: "#22d3ee",
  O: "#fde047",
  T: "#a855f7",
  S: "#4ade80",
  Z: "#ef4444",
  J: "#3b82f6",
  L: "#fb923c",
};

export const LINE_POINTS = [0, 100, 300, 500, 800];


export type Piece = { k: Kind; m: number[][]; x: number; y: number };

export type State = {
  board: (Kind | null)[];
  piece: Piece;
  next: Kind;
  bag: Kind[];
  score: number;
  lines: number;
  level: number;
  over: boolean;
  paused: boolean;
  started: boolean;
  // Устах гэж буй мөрүүд — гялсхийх хөдөлгөөний үеэр тоглоом түр хүлээнэ
  clearing: number[] | null;
  pendingBonus: number;
  // Мөр устгасны дараах "+800 BLOCK!!!" бичиг (id нь хөдөлгөөнийг дахин эхлүүлнэ)
  popup: { id: number; label: string; pts: number; lines: number } | null;
  // Газардсан дүрсийг тогтохоос өмнө хөдөлгөсөн/эргүүлсэн тоо (хязгааргүй хүлээлгэхгүйн тулд)
  lockMoves: number;
};

export type Action =
  | { type: "move"; dx: number }
  | { type: "rotate" }
  | { type: "soft" }
  | { type: "hard" }
  | { type: "tick" }
  | { type: "lock" }
  | { type: "pause"; value?: boolean }
  | { type: "start" }
  | { type: "finishClear" };

export function shuffled(): Kind[] {
  const a = [...KINDS];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 7 дүрсийг холиод дарааллаар нь гаргана — нэг дүрс удаан гарахгүй байх асуудалгүй */
export function draw(bag: Kind[]): [Kind, Kind[]] {
  const b = bag.length ? bag : shuffled();
  return [b[0], b.slice(1)];
}

export function spawn(k: Kind): Piece {
  const m = SHAPES[k];
  return { k, m, x: Math.floor((COLS - m.length) / 2), y: k === "I" ? -1 : 0 };
}

export function cellsOf(p: Piece): [number, number][] {
  const out: [number, number][] = [];
  p.m.forEach((row, r) => row.forEach((v, c) => v && out.push([p.y + r, p.x + c])));
  return out;
}

export function fits(board: (Kind | null)[], p: Piece) {
  return cellsOf(p).every(([r, c]) => c >= 0 && c < COLS && r < ROWS && (r < 0 || !board[r * COLS + c]));
}

export function rotateCW(m: number[][]) {
  const n = m.length;
  return m.map((row, r) => row.map((_, c) => m[n - 1 - c][r]));
}

export function dropDistance(board: (Kind | null)[], p: Piece) {
  let d = 0;
  while (fits(board, { ...p, y: p.y + d + 1 })) d++;
  return d;
}

export function fresh(started: boolean): State {
  const [k, bag1] = draw([]);
  const [next, bag] = draw(bag1);
  return {
    board: Array(COLS * ROWS).fill(null),
    piece: spawn(k),
    next,
    bag,
    score: 0,
    lines: 0,
    level: 0,
    over: false,
    paused: false,
    started,
    clearing: null,
    pendingBonus: 0,
    popup: null,
    lockMoves: 0,
  };
}

export const CLEAR_LABELS = ["", "SINGLE", "DOUBLE", "TRIPLE", "BLOCK!!!"];
export const CLEAR_MS = 320;
/** Газардсаны дараа тогтох хүртэлх хугацаа ба дахин хойшлуулах дээд тоо (орчин үеийн Tetris шиг) */
export const LOCK_MS = 500;
export const MAX_LOCK_MOVES = 15;

export function grounded(s: State) {
  return !fits(s.board, { ...s.piece, y: s.piece.y + 1 });
}

/** Газардсан дүрс хөдөлбөл тогтох хугацаа дахин эхэлнэ */
function moved(s: State, piece: Piece): State {
  return { ...s, piece, lockMoves: grounded(s) ? s.lockMoves + 1 : s.lockMoves };
}

export function spawnNext(s: State, board: (Kind | null)[]): State {
  const piece = spawn(s.next);
  const [next, bag] = draw(s.bag);
  return { ...s, board, piece, next, bag, lockMoves: 0, over: !fits(board, piece) };
}

/** Дүрсийг байранд нь тогтооно — дүүрсэн мөр байвал эхлээд гялсхийлгэнэ */
export function lock(s: State, piece: Piece, bonus = 0): State {
  const board = [...s.board];
  let overTop = false;
  for (const [r, c] of cellsOf(piece)) {
    if (r < 0) overTop = true;
    else board[r * COLS + c] = piece.k;
  }
  if (overTop) return { ...s, board, score: s.score + bonus, over: true };

  const full: number[] = [];
  for (let r = 0; r < ROWS; r++) if (board.slice(r * COLS, r * COLS + COLS).every(Boolean)) full.push(r);
  if (!full.length) return spawnNext({ ...s, score: s.score + bonus }, board);
  return { ...s, board, clearing: full, pendingBonus: bonus };
}

/** Гялсхийсэн мөрүүдийг устгаж, оноо нэмээд дараагийн дүрсийг гаргана */
export function finishClear(s: State): State {
  const rows = s.clearing ?? [];
  const kept: (Kind | null)[][] = [];
  for (let r = 0; r < ROWS; r++) if (!rows.includes(r)) kept.push(s.board.slice(r * COLS, r * COLS + COLS));
  const board = [...Array.from({ length: rows.length }, () => Array(COLS).fill(null)), ...kept].flat();
  const pts = LINE_POINTS[rows.length] * (s.level + 1);
  const lines = s.lines + rows.length;
  return spawnNext(
    {
      ...s,
      clearing: null,
      score: s.score + s.pendingBonus + pts,
      pendingBonus: 0,
      lines,
      level: Math.floor(lines / 10),
      popup: { id: (s.popup?.id ?? 0) + 1, label: CLEAR_LABELS[rows.length], pts, lines: rows.length },
    },
    board,
  );
}

export function reducer(s: State, a: Action): State {
  if (a.type === "start") return fresh(true);
  if (a.type === "pause") {
    if (!s.started || s.over) return s;
    return { ...s, paused: a.value ?? !s.paused };
  }
  if (a.type === "finishClear") return s.clearing ? finishClear(s) : s;
  if (!s.started || s.over || s.paused || s.clearing) return s;

  switch (a.type) {
    case "move": {
      const p = { ...s.piece, x: s.piece.x + a.dx };
      return fits(s.board, p) ? moved(s, p) : s;
    }
    case "rotate": {
      if (s.piece.k === "O") return s;
      const m = rotateCW(s.piece.m);
      // Хананд наалдсан үед хажуу тийш түлхэж эргүүлнэ
      for (const dx of [0, -1, 1, -2, 2]) {
        const p = { ...s.piece, m, x: s.piece.x + dx };
        if (fits(s.board, p)) return moved(s, p);
      }
      return s;
    }
    case "soft":
    case "tick": {
      const p = { ...s.piece, y: s.piece.y + 1 };
      if (fits(s.board, p)) return { ...s, piece: p, score: s.score + (a.type === "soft" ? 1 : 0) };
      // Таталцал газардсан дүрсийг шууд тогтоохгүй — LOCK_MS хүлээнэ
      return a.type === "soft" ? lock(s, s.piece) : s;
    }
    case "lock":
      return grounded(s) ? lock(s, s.piece) : s;
    case "hard": {
      const d = dropDistance(s.board, s.piece);
      return lock(s, { ...s.piece, y: s.piece.y + d }, d * 2);
    }
  }
  return s;
}

export function speedFor(level: number) {
  return Math.max(90, 800 - level * 70);
}
