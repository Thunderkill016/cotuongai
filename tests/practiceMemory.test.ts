import { describe, expect, it } from "vitest";
import { START_FEN } from "../src/chess";
import type { Score } from "../src/engine";
import type { ReviewMoment } from "../src/gameReview";
import {
  buildTodayPracticeQueue,
  duePracticeCount,
  ingestReviewMoment,
  parsePracticeCards,
  recordPracticeAttempt,
} from "../src/practiceMemory";

const cp = (value: number): Score => ({ kind: "cp", value, bound: "exact" });

function moment(kind: ReviewMoment["kind"] = "major-miss"): ReviewMoment {
  return {
    kind,
    candidate: {
      ply: 0,
      move: "h0g2",
      side: "r",
      history: [],
      rootFen: START_FEN,
      cue: {
        move: "h0g2",
        from: "h0",
        to: "g2",
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
    bestmove: "b0c2",
    bestScore: cp(120),
    playedScore: cp(-180),
    bestLine: ["b0c2", "b9c7"],
    playedLine: ["h0g2", "h9g7"],
    lossCp: 300,
  };
}

describe("post-game practice memory", () => {
  it("persists the exact reviewed position, moves, tags and engine provenance", () => {
    const at = 1_800_000_000_000;
    const cards = ingestReviewMoment([], moment(), "h0g2", at);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      rootFen: START_FEN,
      playedMove: "h0g2",
      bestmove: "b0c2",
      reviewKind: "major-miss",
      attempts: 1,
      successes: 0,
      lastOutcome: "missed",
    });
    expect(cards[0].tags).toContain("horse");
    expect(cards[0].engineBuild).toContain("Pikafish");
    expect(cards[0].dueAt).toBe(at + 4 * 60 * 60 * 1000);
  });

  it("upserts the same engine-grounded position instead of duplicating it", () => {
    const first = ingestReviewMoment([], moment(), "h0g2", 1000);
    const second = ingestReviewMoment(first, moment(), "b0c2", 2000);
    expect(second).toHaveLength(1);
    expect(second[0].attempts).toBe(2);
    expect(second[0].successes).toBe(1);
    expect(second[0].consecutiveSuccesses).toBe(1);
  });

  it("spaces independent correct recalls while a miss returns soon", () => {
    const start = 10_000;
    let card = ingestReviewMoment([], moment(), "b0c2", start)[0];
    expect(card.dueAt).toBe(start + 24 * 60 * 60 * 1000);

    card = recordPracticeAttempt(card, "b0c2", start + 1000);
    expect(card.consecutiveSuccesses).toBe(2);
    expect(card.dueAt).toBe(start + 1000 + 3 * 24 * 60 * 60 * 1000);

    card = recordPracticeAttempt(card, "h0g2", start + 2000);
    expect(card.consecutiveSuccesses).toBe(0);
    expect(card.dueAt).toBe(start + 2000 + 4 * 60 * 60 * 1000);
  });

  it("puts due severe mistakes before future cards", () => {
    const now = 20_000_000;
    const severe = ingestReviewMoment([], moment("major-miss"), "h0g2", 0)[0];
    const future = {
      ...ingestReviewMoment([], moment("alternative"), "b0c2", 0)[0],
      id: "future",
      fingerprint: "future",
      dueAt: now + 1000,
    };
    const queue = buildTodayPracticeQueue([future, severe], now);
    expect(queue[0].id).toBe(severe.id);
    expect(duePracticeCount([future, severe], now)).toBe(1);
  });

  it("fails closed when storage is malformed", () => {
    expect(parsePracticeCards("not json")).toEqual([]);
    expect(parsePracticeCards(JSON.stringify([{ id: "broken" }]))).toEqual([]);
  });
});
