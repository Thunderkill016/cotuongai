import { describe, expect, it } from "vitest";
import { inspectMove, position, replay, START_FEN } from "../src/chess";
import {
  EXERCISES,
  recommendExercise,
  summarizeSkills,
  assessAttempt,
  independentSuccesses,
  parseAttempts,
  parseExposures,
  nextAttemptOrdinal,
  type Attempt,
} from "../src/training";
import { parseInfo, scoreLabel, selectLines } from "../src/engine";
import { selectCoachChoice, validateCoachRequest } from "../src/coach";

describe("legal Xiangqi boundaries", () => {
  it("has 44 initial legal moves and restores exact state on undo", () => {
    const game = position();
    expect(game.moves()).toHaveLength(44);
    const root = game.fen();
    expect(game.move("h2e2")).not.toBeNull();
    expect(game.turn()).toBe("b");
    game.undo();
    expect(game.fen()).toBe(root);
  });
  it("blocks horse legs, elephant eyes and a general exposed to the other general", () => {
    expect(
      position("4k4/9/9/9/4p4/9/9/2R6/2N6/4K4 r - - 0 1").move("c1d3"),
    ).toBeNull();
    expect(
      position("4k4/9/9/9/4p4/9/9/9/3R5/2B1K4 r - - 0 1").move("c0e2"),
    ).toBeNull();
    expect(
      position("4k4/9/9/9/4R4/9/9/9/9/4K4 r - - 0 1").move("e5f5"),
    ).toBeNull();
  });
  it("requires exactly one cannon screen for a capture", () => {
    expect(position(EXERCISES[1].fen).move("h2h7")).not.toBeNull();
    expect(
      position(EXERCISES[1].fen.replace("7p1", "9")).move("h2h7"),
    ).toBeNull();
    expect(
      position(EXERCISES[1].fen.replace("4p4", "4p2R1")).move("h2h7"),
    ).toBeNull();
  });
  it("rejects missing kings, facing kings, corrupt FEN and impossible history", () => {
    for (const fen of [
      "9/9/9/9/9/9/9/9/9/9 r - - 0 1",
      "4k4/9/9/9/9/9/9/9/9/4K4 r - - 0 1",
      "bad",
    ])
      expect(() => position(fen)).toThrow();
    expect(() => replay(START_FEN, ["a0a9"])).toThrow();
  });
  it("recognizes repetition without inventing a WXF ruling", () => {
    const moves = [
      "h0g2",
      "h9g7",
      "g2h0",
      "g7h9",
      "h0g2",
      "h9g7",
      "g2h0",
      "g7h9",
    ];
    expect(position(START_FEN, moves).in_threefold_repetition()).toBe(true);
  });
  it("recognizes stalemate as no legal moves (not an automatic draw)", () => {
    const game = position(
      "3aca3/1Cnrk4/b3r4/2p1n4/2b6/9/9/9/4C4/ppppcK3 b - - 0 1",
    );
    expect(game.in_stalemate()).toBe(true);
    expect(game.moves()).toHaveLength(0);
  });
});

describe("bounded teaching fixtures", () => {
  for (const ex of EXERCISES)
    it(`${ex.id}: solution is a legal capture without immediate recapture`, () => {
      const result = inspectMove(ex.fen, ex.solution);
      expect(result.moved.captured).toBeTruthy();
      expect(result.recaptures).toHaveLength(0);
      expect(assessAttempt(ex.fen, ex.solution).success).toBe(true);
    });
  it("a legal quiet move does not pass the capture exercise", () => {
    expect(assessAttempt(EXERCISES[0].fen, "b0c0").success).toBe(false);
  });
  it("a legal recapture refutes the immediate-safety objective", () => {
    const fen = "4k4/9/9/9/4p4/2r6/2n6/9/9/2R1K4 r - - 0 1";
    expect(assessAttempt(fen, "c0c3").success).toBe(false);
  });
  const record: Attempt = {
    id: "a",
    exerciseId: EXERCISES[0].id,
    move: EXERCISES[0].solution,
    success: true,
    hints: 0,
    revealed: false,
    ordinal: 1,
    at: 1000,
  };
  it("never upgrades hinted, revealed or repeated attempts to independent success", () => {
    expect(
      independentSuccesses([
        { ...record, hints: 1 },
        { ...record, revealed: true },
        { ...record, ordinal: 2 },
      ]),
    ).toBe(0);
    expect(independentSuccesses([record, record])).toBe(1);
  });
  it("rejects malformed and fabricated local progress", () => {
    expect(parseAttempts("{")).toEqual([]);
    expect(
      parseAttempts(
        JSON.stringify([
          { ...record, move: "a0a9" },
          { ...record, hints: -1 },
          { ...record, move: "b0c0", success: true },
        ]),
      ),
    ).toEqual([]);
    expect(parseAttempts(JSON.stringify([record, record]))).toHaveLength(1);
  });
  it("retains assistance exposure separately from submitted attempts", () => {
    const exposures = {
      "rook-open-file": { hints: 2, revealed: true, attempts: 1 },
    };
    expect(parseExposures(JSON.stringify(exposures))).toEqual(exposures);
    expect(nextAttemptOrdinal("rook-open-file", [], exposures)).toBe(2);
    expect(parseExposures("{")).toEqual({});
    expect(
      parseExposures('{"rook-open-file":{"hints":-1,"revealed":false}}'),
    ).toEqual({});
  });
});

describe("UCI evidence integrity", () => {
  it("keeps mate, centipawns, bounds and PV separate", () => {
    const mate = parseInfo(
      "info depth 6 multipv 1 score mate -3 nodes 800 time 55 pv h2e2 h9g7",
    )!;
    expect(mate.score).toEqual({ kind: "mate", value: -3, bound: "exact" });
    expect(scoreLabel(mate.score)).toContain("bị chiếu bí");
    expect(
      parseInfo("info depth 7 score cp 42 lowerbound pv h2e2")?.score.bound,
    ).toBe("lower");
    expect(parseInfo("info depth 7 score cp bananas pv h2e2")).toBeNull();
  });
  it("does not combine PVs from different depths or use illegal PVs", () => {
    const first = parseInfo("info depth 5 multipv 1 score cp 20 pv h2e2")!;
    const second = parseInfo("info depth 4 multipv 2 score cp 10 pv b2e2")!;
    expect(selectLines([first, second], START_FEN, 2)).toEqual([]);
    expect(selectLines([first, { ...first, rank: 2 }], START_FEN, 2)).toEqual(
      [],
    );
    expect(selectLines([{ ...first, pv: ["a0a9"] }], START_FEN, 1)).toEqual([]);
    expect(
      selectLines([first, { ...second, depth: 5 }], START_FEN, 2),
    ).toHaveLength(2);
  });
});

describe("AI selects vetted questions only", () => {
  it("rejects added prose or invented IDs", () => {
    const choices = [{ id: "safe", text: "Verified prompt" }];
    expect(selectCoachChoice('{"choiceId":"safe"}', choices)).toEqual(
      choices[0],
    );
    expect(() =>
      selectCoachChoice(
        '{"choiceId":"safe","explanation":"invented"}',
        choices,
      ),
    ).toThrow();
    expect(() => selectCoachChoice('{"choiceId":"other"}', choices)).toThrow();
  });
  it("rejects illegal engine evidence before a provider call", () => {
    expect(() =>
      validateCoachRequest({
        fen: START_FEN,
        move: "h2e2",
        evidence: {
          bestmove: "a0a9",
          pv: ["a0a9"],
          depth: 5,
          score: { kind: "cp", value: 10 },
        },
      }),
    ).toThrow();
  });
});

describe("adaptive practice recommendation", () => {
  const attempt = (
    exerciseId: string,
    success: boolean,
    options: Partial<Attempt> = {},
  ): Attempt => ({
    id: `${exerciseId}-${Math.random()}`,
    exerciseId,
    move: EXERCISES.find((exercise) => exercise.id === exerciseId)!.solution,
    success,
    hints: 0,
    revealed: false,
    ordinal: 1,
    at: Date.now(),
    ...options,
  });

  it("starts with an unseen practice exercise", () => {
    expect(recommendExercise([], {}).exercise.id).toBe("rook-open-file");
  });

  it("prioritizes a failed latest attempt", () => {
    const attempts = [attempt("rook-open-file", false)];
    expect(recommendExercise(attempts, {}).exercise.id).toBe("rook-open-file");
  });

  it("recommends independent retry after assisted success", () => {
    const attempts = [attempt("rook-open-file", true, { hints: 1 })];
    const recommendation = recommendExercise(attempts, {});
    expect(recommendation.exercise.id).toBe("rook-open-file");
    expect(recommendation.reason).toContain("gợi ý");
  });

  it("summarizes evidence without calling it mastery", () => {
    const attempts = [
      attempt("rook-open-file", true),
      attempt("cannon-screen", false),
    ];
    const summaries = summarizeSkills(attempts);
    expect(
      summaries.find((summary) => summary.id === "line-piece")?.status,
    ).toBe("independent-evidence");
    expect(
      summaries.find((summary) => summary.id === "cannon-screen")?.status,
    ).toBe("needs-review");
    expect(
      summaries.find((summary) => summary.id === "horse-leg")?.status,
    ).toBe("untested");
  });
});
