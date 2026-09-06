import { START_FEN, position, replay, type Side } from "./chess";

export type PlayerSide = Side;
export type GamePhase = "playing" | "finished";
export type GameResult =
  | { kind: "checkmate" | "stalemate"; winner: PlayerSide; loser: PlayerSide }
  | {
      kind: "draw";
      reason: "repetition" | "sixty-move" | "insufficient-material";
    };

export interface GameSnapshot {
  fen: string;
  turn: PlayerSide;
  phase: GamePhase;
  result: GameResult | null;
  inCheck: boolean;
}

export function sideName(side: PlayerSide): string {
  return side === "r" ? "Đỏ" : "Đen";
}

export function otherSide(side: PlayerSide): PlayerSide {
  return side === "r" ? "b" : "r";
}

export function currentSnapshot(
  moves: string[],
  startFen = START_FEN,
): GameSnapshot {
  const game = position(startFen, moves);
  let result: GameResult | null = null;

  if (game.in_checkmate()) {
    result = {
      kind: "checkmate",
      winner: otherSide(game.turn()),
      loser: game.turn(),
    };
  } else if (game.in_stalemate()) {
    // The vendored rules library treats no legal move as a loss for the side to move.
    result = {
      kind: "stalemate",
      winner: otherSide(game.turn()),
      loser: game.turn(),
    };
  } else if (game.in_threefold_repetition()) {
    // WXF long-check/long-chase adjudication is not implemented yet. Keep this
    // explicit so the product does not claim tournament-rule correctness here.
    result = { kind: "draw", reason: "repetition" };
  } else if (game.insufficient_material()) {
    result = { kind: "draw", reason: "insufficient-material" };
  } else if (game.in_draw()) {
    result = { kind: "draw", reason: "sixty-move" };
  }

  return {
    fen: game.fen(),
    turn: game.turn(),
    phase: result ? "finished" : "playing",
    result,
    inCheck: game.in_check(),
  };
}

export function canHumanMove(
  moves: string[],
  humanSide: PlayerSide,
  aiThinking: boolean,
  startFen = START_FEN,
): boolean {
  const snapshot = currentSnapshot(moves, startFen);
  return (
    snapshot.phase === "playing" && !aiThinking && snapshot.turn === humanSide
  );
}

export function isAiTurn(
  moves: string[],
  humanSide: PlayerSide,
  startFen = START_FEN,
): boolean {
  const snapshot = currentSnapshot(moves, startFen);
  return snapshot.phase === "playing" && snapshot.turn !== humanSide;
}

export function appendLegalMove(
  moves: string[],
  move: string,
  startFen = START_FEN,
): string[] {
  if (!/^[a-i][0-9][a-i][0-9]$/.test(move))
    throw new Error("Nước đi không đúng định dạng.");
  const game = position(startFen, moves);
  if (game.game_over()) throw new Error("Ván cờ đã kết thúc.");
  if (!game.move(move))
    throw new Error("Nước đi không hợp lệ trong thế hiện tại.");
  return [...moves, move];
}

export function undoToHumanTurn(
  moves: string[],
  humanSide: PlayerSide,
  startFen = START_FEN,
): string[] {
  if (!moves.length) return [];
  let next = moves.slice(0, -1);
  while (next.length && position(startFen, next).turn() !== humanSide)
    next = next.slice(0, -1);
  return next;
}

export function moveListRows(moves: string[]) {
  return Array.from({ length: Math.ceil(moves.length / 2) }, (_, index) => ({
    number: index + 1,
    red: moves[index * 2] ?? null,
    black: moves[index * 2 + 1] ?? null,
  }));
}

export function resultLabel(result: GameResult | null): string {
  if (!result) return "";
  if (result.kind !== "draw") {
    return result.kind === "checkmate"
      ? `${sideName(result.winner)} thắng — chiếu bí.`
      : `${sideName(result.winner)} thắng — đối thủ hết nước hợp lệ.`;
  }
  if (result.reason === "repetition")
    return "Thế cờ lặp lại. Bản này chưa phân xử đầy đủ trường chiếu/trường tróc theo luật thi đấu.";
  if (result.reason === "insufficient-material")
    return "Hòa do không còn đủ lực lượng để kết thúc ván theo bộ luật hiện tại.";
  return "Hòa theo giới hạn 60 nước không bắt quân của bộ luật hiện tại.";
}

export function fenAfter(moves: string[], startFen = START_FEN): string {
  return replay(startFen, moves);
}
