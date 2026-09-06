import { START_FEN, position, replay, type Side } from "./chess";
import { adjudicateRepetition } from "./repetition";

export type PlayerSide = Side;
export type GamePhase = "playing" | "finished";
export type GameResult =
  | {
      kind: "checkmate" | "stalemate" | "perpetual-check";
      winner: PlayerSide;
      loser: PlayerSide;
    }
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
  const repetition = adjudicateRepetition(moves, startFen);
  const halfMoves = Number(game.fen().split(/\s+/)[4]);
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
  } else if (repetition.kind === "perpetual-check-loss") {
    result = {
      kind: "perpetual-check",
      winner: repetition.winner,
      loser: repetition.offender,
    };
  } else if (repetition.kind === "fourfold-draw") {
    // This is only the neutral/fourfold boundary. Full perpetual-chase (trường
    // tróc) exceptions are intentionally not claimed here yet.
    result = { kind: "draw", reason: "repetition" };
  } else if (game.insufficient_material()) {
    result = { kind: "draw", reason: "insufficient-material" };
  } else if (Number.isFinite(halfMoves) && halfMoves >= 120) {
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
  if (currentSnapshot(moves, startFen).phase === "finished")
    throw new Error("Ván cờ đã kết thúc.");
  const game = position(startFen, moves);
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
  if (result.kind === "checkmate")
    return `${sideName(result.winner)} thắng — chiếu bí.`;
  if (result.kind === "stalemate")
    return `${sideName(result.winner)} thắng — đối thủ hết nước hợp lệ.`;
  if (result.kind === "perpetual-check")
    return `${sideName(result.winner)} thắng — ${sideName(result.loser)} lặp chiếu Tướng liên tục và không đổi nước.`;
  if (result.reason === "repetition")
    return "Hòa do thế cờ lặp bốn lần. Bản này chưa tự động phân xử đầy đủ trường tróc theo luật thi đấu.";
  if (result.reason === "insufficient-material")
    return "Hòa do không còn đủ lực lượng để kết thúc ván theo bộ luật hiện tại.";
  return "Hòa theo giới hạn 60 nước không bắt quân của bộ luật hiện tại.";
}

export function fenAfter(moves: string[], startFen = START_FEN): string {
  return replay(startFen, moves);
}
