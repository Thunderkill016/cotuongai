import { position, START_FEN, type Side } from "./chess";

export const GAME_STORAGE_KEY = "ky-lo.game.v1";
// The existing rules/engine wrapper accepts at most 300 half-moves.
export const MAX_GAME_PLIES = 300;
export type GameMode = "practice" | "challenge";
export interface LocalGame {
  version: 1;
  humanSide: Side;
  mode: GameMode;
  moves: string[];
  resigned: boolean;
}
export type Outcome =
  | { kind: "active"; check: boolean }
  | { kind: "checkmate" | "stalemate" | "resigned"; winner: Side }
  | { kind: "repetition-unsupported" }
  | { kind: "move-limit" };

export function createGame(
  humanSide: Side = "r",
  mode: GameMode = "practice",
): LocalGame {
  return { version: 1, humanSide, mode, moves: [], resigned: false };
}

export function positionOutcome(fen: string, moves: string[] = []): Outcome {
  const board = position(fen, moves);
  const winner = board.turn() === "r" ? "b" : "r";
  if (board.in_checkmate()) return { kind: "checkmate", winner };
  if (board.in_stalemate()) return { kind: "stalemate", winner };
  // The library calls repetition a draw; WXF check/chase adjudication is not implemented.
  if (board.in_threefold_repetition())
    return { kind: "repetition-unsupported" };
  if (moves.length >= MAX_GAME_PLIES) return { kind: "move-limit" };
  return { kind: "active", check: board.in_check() };
}

export function gameOutcome(game: LocalGame): Outcome {
  if (game.resigned)
    return { kind: "resigned", winner: game.humanSide === "r" ? "b" : "r" };
  return positionOutcome(START_FEN, game.moves);
}

export function playGameMove(
  game: LocalGame,
  move: string,
  actor: "human" | "engine",
): LocalGame {
  if (gameOutcome(game).kind !== "active")
    throw new Error("Ván này đã dừng. Bạn có thể xem lại hoặc chơi ván mới.");
  const board = position(START_FEN, game.moves);
  if ((board.turn() === game.humanSide) !== (actor === "human"))
    throw new Error("Chưa tới lượt của bên này.");
  if (!/^[a-i][0-9][a-i][0-9]$/.test(move) || !board.move(move))
    throw new Error("Nước đi không hợp lệ.");
  return { ...game, moves: [...game.moves, move] };
}

export function canUndoGame(game: LocalGame): boolean {
  const firstHumanPly = game.humanSide === "r" ? 0 : 1;
  return (
    game.mode === "practice" &&
    !game.resigned &&
    game.moves.length > firstHumanPly
  );
}

export function undoGame(game: LocalGame): LocalGame {
  if (!canUndoGame(game))
    throw new Error("Không thể xin đi lại trong ván này.");
  const humanTurn = position(START_FEN, game.moves).turn() === game.humanSide;
  return { ...game, moves: game.moves.slice(0, -(humanTurn ? 2 : 1)) };
}

export function resignGame(game: LocalGame): LocalGame {
  if (gameOutcome(game).kind !== "active") throw new Error("Ván này đã dừng.");
  return { ...game, resigned: true };
}

export function parseLocalGame(raw: string | null): LocalGame | null {
  if (!raw || raw.length > 10000) return null; // Bounds untrusted browser storage before parsing.
  try {
    const value = JSON.parse(raw);
    if (
      !value ||
      value.version !== 1 ||
      !["r", "b"].includes(value.humanSide) ||
      !["practice", "challenge"].includes(value.mode) ||
      typeof value.resigned !== "boolean" ||
      !Array.isArray(value.moves) ||
      value.moves.length > MAX_GAME_PLIES
    )
      return null;
    let game = createGame(value.humanSide, value.mode);
    for (const move of value.moves) {
      if (typeof move !== "string") return null;
      const human = position(START_FEN, game.moves).turn() === game.humanSide;
      game = playGameMove(game, move, human ? "human" : "engine");
    }
    return value.resigned ? resignGame(game) : game;
  } catch {
    return null; // Invalid storage must not reach the board or establish a result.
  }
}

export function describeGameStatus(game: LocalGame): string {
  const outcome = gameOutcome(game);
  const side = position(START_FEN, game.moves).turn() === "r" ? "Đỏ" : "Đen";
  if (outcome.kind === "active")
    return `${side} tới lượt${outcome.check ? " · đang bị chiếu Tướng, phải giải chiếu" : ""}.`;
  if (outcome.kind === "repetition-unsupported")
    return "Tạm dừng vì lặp thế. Chưa phân xử trường chiếu/trường tróc; không tính là hòa.";
  if (outcome.kind === "move-limit")
    return "Đã tới giới hạn 300 nước nửa lượt của ván luyện. Không tính là hòa.";
  const winner = outcome.winner === "r" ? "Đỏ" : "Đen";
  return `${winner} thắng · ${outcome.kind === "resigned" ? "bạn đã xin thua" : outcome.kind === "checkmate" ? "chiếu bí" : "đối thủ hết nước hợp lệ"}.`;
}

// A small, versioned portable record; not PGN or XQF. Engine analysis and local
// practice history stay outside this format because they have separate provenance.
export const MAX_GAME_FILE_BYTES = 20_000;
export function exportGameFile(game: LocalGame): string {
  const validated = parseLocalGame(JSON.stringify(game));
  if (!validated) throw new Error("Ván cờ không hợp lệ để lưu ra tệp.");
  return JSON.stringify(
    { format: "ky-lo-game", version: 1, startFen: START_FEN, game: validated },
    null,
    2,
  );
}

export function importGameFile(raw: string): LocalGame {
  if (raw.length > MAX_GAME_FILE_BYTES)
    throw new Error("Tệp ván cờ quá lớn. Chỉ nhận tối đa 20 KB.");
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Không đọc được tệp ván cờ Kỳ Lộ.");
  }
  if (
    !value ||
    value.format !== "ky-lo-game" ||
    value.version !== 1 ||
    value.startFen !== START_FEN
  )
    throw new Error("Chỉ mở được tệp ván Kỳ Lộ từ thế xuất phát chuẩn.");
  const game = parseLocalGame(JSON.stringify(value.game));
  if (!game)
    throw new Error("Tệp chứa nước đi hoặc thông tin ván không hợp lệ.");
  return game;
}
