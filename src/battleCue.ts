import { FILES, position, squareAt, type Piece } from "./chess";

export type BattleCueKind =
  | "move"
  | "capture"
  | "cannon-shot"
  | "chariot-charge"
  | "cavalry-strike";

export interface BattleCue {
  move: string;
  from: string;
  to: string;
  mover: Piece["type"];
  capture: boolean;
  captured: Piece["type"] | null;
  givesCheck: boolean;
  checkedKingSquare: string | null;
  cannonScreenSquare: string | null;
  kind: BattleCueKind;
}

function squaresBetween(from: string, to: string): string[] {
  if (from === to) return [];
  const fromFile = FILES.indexOf(from[0]);
  const toFile = FILES.indexOf(to[0]);
  const fromRank = Number(from[1]);
  const toRank = Number(to[1]);
  const result: string[] = [];

  if (fromFile === toFile) {
    const step = Math.sign(toRank - fromRank);
    for (let rank = fromRank + step; rank !== toRank; rank += step)
      result.push(`${from[0]}${rank}`);
    return result;
  }

  if (fromRank === toRank) {
    const step = Math.sign(toFile - fromFile);
    for (let file = fromFile + step; file !== toFile; file += step)
      result.push(`${FILES[file]}${fromRank}`);
  }
  return result;
}

export function horsePaths(fen: string, square: string) {
  const game = position(fen);
  if (game.get(square)?.type !== "n") return [];
  const legal = new Set(game.moves({ square }));
  const x = FILES.indexOf(square[0]),
    y = Number(square[1]);
  const offsets = [
    [1, 2],
    [-1, 2],
    [1, -2],
    [-1, -2],
    [2, 1],
    [2, -1],
    [-2, 1],
    [-2, -1],
  ];
  return offsets.flatMap(([dx, dy]) => {
    const tx = x + dx,
      ty = y + dy;
    if (tx < 0 || tx > 8 || ty < 0 || ty > 9) return [];
    const to = `${FILES[tx]}${ty}`;
    const leg = `${FILES[x + (Math.abs(dx) === 2 ? Math.sign(dx) : 0)]}${y + (Math.abs(dy) === 2 ? Math.sign(dy) : 0)}`;
    return [
      {
        from: square,
        to,
        leg,
        blocked: !!game.get(leg),
        legal: legal.has(square + to),
      },
    ];
  });
}

export function checkedGeneral(fen: string): string | null {
  const game = position(fen);
  return game.in_check() ? kingSquare(game, game.turn()) : null;
}

export function transitionCue(
  before: string | null,
  after: string,
  move?: string | null,
): BattleCue | null {
  if (!before || !move || !/^[a-i][0-9][a-i][0-9]$/.test(move)) return null;
  const game = position(before);
  if (!game.move(move) || game.fen() !== position(after).fen()) return null;
  return deriveBattleCue(before, move);
}

// CSS-pixel tolerance for small hand jitter; camera drags never pick a square.
const PICK_SLOP_PX = 6;
export function isBoardTap(
  start: { x: number; y: number } | null,
  end: { x: number; y: number },
) {
  return (
    !!start && Math.hypot(end.x - start.x, end.y - start.y) <= PICK_SLOP_PX
  );
}

export function fitBoardDistance(aspect: number, fovDegrees: number) {
  // Eleven world units includes edge pieces; five allows for the near board edge.
  return Math.max(
    14,
    5 + 11 / (2 * Math.tan((fovDegrees * Math.PI) / 360) * Math.min(1, aspect)),
  );
}

function kingSquare(game: ReturnType<typeof position>, side: "r" | "b") {
  let found: string | null = null;
  game.board().forEach((row, rowIndex) =>
    row.forEach((piece, colIndex) => {
      if (piece?.type === "k" && piece.color === side)
        found = squareAt(rowIndex, colIndex);
    }),
  );
  return found;
}

export function deriveBattleCue(beforeFen: string, move: string): BattleCue {
  if (!/^[a-i][0-9][a-i][0-9]$/.test(move))
    throw new Error("Nước đi không đúng định dạng.");

  const game = position(beforeFen);
  const from = move.slice(0, 2);
  const to = move.slice(2);
  const mover = game.get(from);
  const target = game.get(to);
  if (!mover) throw new Error("Không có quân ở ô xuất phát.");

  let cannonScreenSquare: string | null = null;
  if (mover.type === "c" && target) {
    const screens = squaresBetween(from, to).filter((square) =>
      game.get(square),
    );
    if (screens.length === 1) cannonScreenSquare = screens[0];
  }

  const moved = game.move(move);
  if (!moved) throw new Error("Nước đi không hợp lệ.");
  const givesCheck = game.in_check();
  const capture = Boolean(moved.captured);

  let kind: BattleCueKind = capture ? "capture" : "move";
  if (capture && mover.type === "c") kind = "cannon-shot";
  else if (capture && mover.type === "r") kind = "chariot-charge";
  else if (capture && mover.type === "n") kind = "cavalry-strike";

  return {
    move,
    from,
    to,
    mover: mover.type,
    capture,
    captured: moved.captured ?? null,
    givesCheck,
    checkedKingSquare: givesCheck ? kingSquare(game, game.turn()) : null,
    cannonScreenSquare,
    kind,
  };
}
