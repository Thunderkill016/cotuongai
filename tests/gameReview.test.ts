import { describe, expect, it } from "vitest";
import { START_FEN, replay } from "../src/chess";
import type { Score } from "../src/engine";
import {
  classifyReviewMoment,
  evaluationLossCp,
  planReviewCandidates,
  selectReviewMoments,
  type ReviewEvidence,
} from "../src/gameReview";

const cp = (value: number): Score => ({ kind: "cp", value, bound: "exact" });

function evidence(
  ply: number,
  move: string,
  bestmove: string,
  lossCp: number | null,
): ReviewEvidence {
  const history = ["h0g2", "h9g7", "g2h0", "g7h9"].slice(0, ply);
  return {
    candidate: {
      ply,
      move,
      side: "r",
      history,
      rootFen: replay(START_FEN, history),
      cue: {
        move,
        from: move.slice(0, 2),
        to: move.slice(2),
        mover: "n",
        capture: false,
        captured: null,
        givesCheck: false,
        checkedKingSquare: null,
        cannonScreenSquare: null,
        kind: "move",
      },
      heuristic: 0,
    },
    bestmove,
    bestScore: cp(120),
    playedScore: cp(120 - (lossCp ?? 0)),
    bestLine: [bestmove],
    playedLine: [move],
    lossCp,
  };
}

describe("post-game review planning", () => {
  it("only plans positions where the human was to move", () => {
    const moves = ["h0g2", "h9g7", "g2h0", "g7h9"];
    expect(planReviewCandidates(moves, "r").map((item) => item.ply)).toEqual([
      0, 2,
    ]);
    expect(planReviewCandidates(moves, "b").map((item) => item.ply)).toEqual([
      1, 3,
    ]);
  });

  it("caps engine work while preserving chronological candidates", () => {
    const cycle = ["h0g2", "h9g7", "g2h0", "g7h9"];
    const moves = [...cycle, ...cycle, ...cycle, ...cycle, ...cycle];
    const planned = planReviewCandidates(moves, "r", 5);
    expect(planned).toHaveLength(5);
    expect(planned.map((item) => item.ply)).toEqual(
      [...planned.map((item) => item.ply)].sort((a, b) => a - b),
    );
  });

  it("compares exact engine scores from the same root", () => {
    expect(evaluationLossCp(cp(180), cp(-20))).toBe(200);
    expect(evaluationLossCp(cp(-100), cp(-260))).toBe(160);
    expect(
      evaluationLossCp(
        { kind: "mate", value: 4, bound: "exact" },
        { kind: "cp", value: 500, bound: "exact" },
      ),
    ).toBeGreaterThan(90_000);
    expect(
      evaluationLossCp(
        { kind: "cp", value: 100, bound: "lower" },
        cp(0),
      ),
    ).toBeNull();
  });

  it("labels good engine matches separately from mistakes", () => {
    expect(classifyReviewMoment(evidence(0, "h0g2", "h0g2", 0))).toBe(
      "good-find",
    );
    expect(classifyReviewMoment(evidence(0, "h0g2", "b0c2", 320))).toBe(
      "major-miss",
    );
    expect(classifyReviewMoment(evidence(0, "h0g2", "b0c2", 120))).toBe(
      "improvement",
    );
  });

  it("selects at most seven moments and does not fabricate all of them as errors", () => {
    const all = Array.from({ length: 10 }, (_, index) =>
      evidence(
        index,
        index % 2 ? "h9g7" : "h0g2",
        index < 2 ? (index % 2 ? "h9g7" : "h0g2") : "b0c2",
        index < 2 ? 0 : index * 60,
      ),
    );
    const selected = selectReviewMoments(all);
    expect(selected.length).toBeLessThanOrEqual(7);
    expect(selected.some((item) => item.kind === "major-miss")).toBe(true);
  });
});
