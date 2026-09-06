import { position, type Side } from "./chess";

export type RepetitionAdjudication =
  | {
      kind: "none";
      currentOccurrences: number;
    }
  | {
      kind: "fourfold-draw";
      currentOccurrences: number;
      cycleStartPly: number;
      cycleLength: number;
    }
  | {
      kind: "perpetual-check-loss";
      currentOccurrences: number;
      cycleStartPly: number;
      cycleLength: number;
      offender: Side;
      winner: Side;
    };

interface MoveTrace {
  mover: Side;
  givesCheck: boolean;
}

function positionKey(fen: string): string {
  return fen.split(/\s+/).slice(0, 2).join(" ");
}

function otherSide(side: Side): Side {
  return side === "r" ? "b" : "r";
}

/**
 * Adjudicate only repetition facts we can establish deterministically from the
 * move history.
 *
 * WXF 3.2.B uses four occurrences for a neutral repeated position. WXF 3.1.H
 * requires a perpetual checker to change rather than receiving a neutral draw.
 * Full perpetual-chase classification is more involved and intentionally stays
 * outside this function until its exceptions are ported and tested.
 */
export function adjudicateRepetition(
  moves: string[],
  startFen: string,
): RepetitionAdjudication {
  const game = position(startFen);
  const keys = [positionKey(game.fen())];
  const trace: MoveTrace[] = [];

  for (const move of moves) {
    const mover = game.turn();
    const moved = game.move(move);
    if (!moved) throw new Error("Lịch sử chứa nước không hợp lệ.");
    trace.push({ mover, givesCheck: game.in_check() });
    keys.push(positionKey(game.fen()));
  }

  const currentKey = keys.at(-1)!;
  const occurrences: number[] = [];
  keys.forEach((key, ply) => {
    if (key === currentKey) occurrences.push(ply);
  });

  if (occurrences.length < 4)
    return { kind: "none", currentOccurrences: occurrences.length };

  const lastFour = occurrences.slice(-4);
  const cycleStartPly = lastFour[0];
  const finalPly = lastFour[3];
  const cycleLength = lastFour[3] - lastFour[2];
  const window = trace.slice(cycleStartPly, finalPly);

  const checksEveryMove = (side: Side) => {
    const own = window.filter((item) => item.mover === side);
    return own.length >= 2 && own.every((item) => item.givesCheck);
  };

  const redChecks = checksEveryMove("r");
  const blackChecks = checksEveryMove("b");

  if (redChecks !== blackChecks) {
    const offender: Side = redChecks ? "r" : "b";
    return {
      kind: "perpetual-check-loss",
      currentOccurrences: occurrences.length,
      cycleStartPly,
      cycleLength,
      offender,
      winner: otherSide(offender),
    };
  }

  return {
    kind: "fourfold-draw",
    currentOccurrences: occurrences.length,
    cycleStartPly,
    cycleLength,
  };
}
