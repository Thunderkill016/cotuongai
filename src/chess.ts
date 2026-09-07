import {
  Xiangqi,
  type Move,
  type Piece,
  type PieceType,
} from "../vendor/xiangqi/xiangqi.js";
export { type Move, type Piece, type Side } from "../vendor/xiangqi/xiangqi.js";

export const START_FEN =
  "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR r - - 0 1";
export const FILES = "abcdefghi";
export const PIECE_NAMES: Record<PieceType, string> = {
  k: "Tướng",
  a: "Sĩ",
  b: "Tượng",
  n: "Mã",
  r: "Xe",
  c: "Pháo",
  p: "Tốt",
};
export const GLYPHS: Record<string, string> = {
  rk: "帥",
  ra: "仕",
  rb: "相",
  rn: "馬",
  rr: "車",
  rc: "炮",
  rp: "兵",
  bk: "將",
  ba: "士",
  bb: "象",
  bn: "馬",
  br: "車",
  bc: "砲",
  bp: "卒",
};
export const squareAt = (row: number, col: number) => `${FILES[col]}${9 - row}`;
export const pieceName = (piece: Piece) =>
  `${PIECE_NAMES[piece.type]} ${piece.color === "r" ? "đỏ" : "đen"}`;

export function position(
  fen: string = START_FEN,
  history: string[] = [],
): Xiangqi {
  if (typeof fen !== "string" || fen.length > 160)
    throw new Error("Mã thế cờ không hợp lệ.");
  const normalized = fen.replace(/ w /, " r ");
  const game = new Xiangqi();
  if (!game.validate_fen(normalized).valid || !game.load(normalized))
    throw new Error("Mã thế cờ không hợp lệ.");
  const kings = { r: [] as string[], b: [] as string[] };
  game.board().forEach((row, r) =>
    row.forEach((p, c) => {
      if (p?.type === "k") kings[p.color].push(squareAt(r, c));
    }),
  );
  if (kings.r.length !== 1 || kings.b.length !== 1)
    throw new Error("Thế cờ cần đúng một Tướng mỗi bên.");
  for (const side of ["r", "b"] as const) {
    const sq = kings[side][0];
    if (!"def".includes(sq[0]) || (side === "r" ? +sq[1] > 2 : +sq[1] < 7))
      throw new Error("Tướng phải ở trong cung.");
  }
  if (kings.r[0][0] === kings.b[0][0]) {
    const file = kings.r[0][0];
    let blockers = 0;
    for (let rank = +kings.r[0][1] + 1; rank < +kings.b[0][1]; rank++)
      if (game.get(`${file}${rank}`)) blockers++;
    if (!blockers) throw new Error("Hai Tướng không được đối mặt.");
  }
  if (history.length > 300)
    throw new Error("Ván luyện đã đạt giới hạn 300 nước nửa lượt.");
  for (const move of history)
    if (!/^[a-i][0-9][a-i][0-9]$/.test(move) || !game.move(move))
      throw new Error("Lịch sử chứa nước không hợp lệ.");
  return game;
}

export function describeMove(fen: string, uci: string): string {
  const game = position(fen);
  // Upstream pretty moves uppercase Red piece codes; board pieces stay canonical.
  const piece = game.get(uci.slice(0, 2));
  const moved = game.move(uci);
  if (!moved || !piece) return "Nước đi không hợp lệ";
  // Each side numbers files from its own right to left, independent of board flip.
  const fileNumber = (sq: string) =>
    piece.color === "r" ? 9 - FILES.indexOf(sq[0]) : FILES.indexOf(sq[0]) + 1;
  const delta = Number(moved.to[1]) - Number(moved.from[1]);
  const action =
    delta === 0
      ? "bình"
      : delta * (piece.color === "r" ? 1 : -1) > 0
        ? "tấn"
        : "thoái";
  const destination =
    delta === 0 || ["n", "a", "b"].includes(piece.type)
      ? fileNumber(moved.to)
      : Math.abs(delta);
  const peers = position(fen)
    .board()
    .flatMap((row, r) =>
      row.flatMap((p, c) =>
        p?.type === piece.type &&
        p.color === piece.color &&
        FILES[c] === moved.from[0]
          ? [squareAt(r, c)]
          : [],
      ),
    )
    .sort((a, b) =>
      piece.color === "r"
        ? Number(b[1]) - Number(a[1])
        : Number(a[1]) - Number(b[1]),
    );
  const order = peers.indexOf(moved.from);
  const origin =
    peers.length === 1
      ? String(fileNumber(moved.from))
      : peers.length === 2
        ? order === 0
          ? "trước"
          : "sau"
        : peers.length === 3
          ? ["trước", "giữa", "sau"][order]
          : `thứ ${order + 1} từ trước`;
  return `${PIECE_NAMES[piece.type]} ${origin} ${action} ${destination}${moved.captured ? `, ăn ${PIECE_NAMES[moved.captured]}` : ""}`;
}

export function describeLine(fen: string, moves: string[]): string[] {
  const game = position(fen);
  return moves.map((move) => {
    const text = describeMove(game.fen(), move);
    if (!game.move(move)) throw new Error("Biến cờ chứa nước không hợp lệ.");
    return text;
  });
}

export function replay(fen: string, moves: string[]): string {
  return position(fen, moves).fen();
}

export function inspectMove(
  fen: string,
  move: string,
): { moved: Move; recaptures: Move[]; check: boolean; after: string } {
  const game = position(fen);
  const moved = game.move(move);
  if (!moved) throw new Error("Nước đi không hợp lệ.");
  return {
    moved,
    recaptures: game
      .moves({ verbose: true })
      .filter((m) => m.to === moved.to && m.captured),
    check: game.in_check(),
    after: game.fen(),
  };
}
