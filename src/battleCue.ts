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
    const screens = squaresBetween(from, to).filter((square) => game.get(square));
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
