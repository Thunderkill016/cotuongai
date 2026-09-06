import { describe, expect, it } from "vitest";
import { START_FEN } from "../src/chess";
import { adjudicateRepetition } from "../src/repetition";

const KNIGHT_CYCLE = ["h0g2", "h9g7", "g2h0", "g7h9"];

function repeated<T>(cycle: T[], count: number): T[] {
  return Array.from({ length: count }, () => cycle).flat();
}

describe("repetition adjudication", () => {
  it("does not stop the game at the vendored library's threefold threshold", () => {
    const result = adjudicateRepetition(repeated(KNIGHT_CYCLE, 2), START_FEN);
    expect(result).toEqual({ kind: "none", currentOccurrences: 3 });
  });

  it("recognizes a neutral position after four occurrences", () => {
    const result = adjudicateRepetition(repeated(KNIGHT_CYCLE, 3), START_FEN);
    expect(result).toMatchObject({
      kind: "fourfold-draw",
      currentOccurrences: 4,
      cycleStartPly: 0,
      cycleLength: 4,
    });
  });

  it("penalizes the side that alone perpetually checks through the repeated cycle", () => {
    const fen = "4k4/9/3R5/9/9/9/9/9/9/5K3 r - - 0 1";
    const cycle = ["d7e7", "e9d9", "e7d7", "d9e9"];
    const result = adjudicateRepetition(repeated(cycle, 3), fen);
    expect(result).toMatchObject({
      kind: "perpetual-check-loss",
      currentOccurrences: 4,
      cycleLength: 4,
      offender: "r",
      winner: "b",
    });
  });

  it("keeps mutual perpetual checking neutral at the repetition layer", () => {
    const fen = "4k4/9/3R5/9/9/9/9/5r3/9/4K4 r - - 0 1";
    const cycle = ["d7e7", "e9d9", "f2d2", "e0f0"];
    expect(() => adjudicateRepetition(repeated(cycle, 3), fen)).toThrow();
  });

  it("fails closed on an illegal history", () => {
    expect(() => adjudicateRepetition(["a0a9"], START_FEN)).toThrow(/hợp lệ/);
  });
});
