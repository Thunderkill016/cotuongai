import { describe, expect, it } from "vitest";
import { START_FEN } from "../src/chess";
import type { Score } from "../src/engine";
import type { ReviewMoment } from "../src/gameReview";
import {
  buildTodayPracticeQueue,
  duePracticeCount,
  ingestReviewMoment,
  parsePracticeCards,
  practiceDueLabel,
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
    expect(second[0].consecutiveSuccesses).toBe(0);
    expect(second[0].lastAttemptKind).toBe("repeated");
    expect(second[0].dueAt).toBe(first[0].dueAt);
  });

  it("spaces independent correct recalls while a miss returns soon", () => {
    const start = 10_000;
    let card = ingestReviewMoment([], moment(), "b0c2", start)[0];
    expect(card.dueAt).toBe(start + 24 * 60 * 60 * 1000);

    const nextDue = card.dueAt;
    card = recordPracticeAttempt(card, "b0c2", nextDue);
    expect(card.consecutiveSuccesses).toBe(2);
    expect(card.dueAt).toBe(nextDue + 3 * 24 * 60 * 60 * 1000);

    const laterDue = card.dueAt;
    card = recordPracticeAttempt(card, "h0g2", laterDue);
    expect(card.consecutiveSuccesses).toBe(0);
    expect(card.dueAt).toBe(laterDue + 4 * 60 * 60 * 1000);
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

  it("bounds sessions to five distinct due positions, oldest overdue first", () => {
    const base = ingestReviewMoment([], moment(), "h0g2", 0)[0];
    const cards = Array.from({ length: 8 }, (_, i) => ({
      ...base,
      id: String(i),
      dueAt: i,
      reviewKind: i === 0 ? ("good-find" as const) : ("major-miss" as const),
    }));
    expect(
      buildTodayPracticeQueue([...cards, cards[0]], 6).map((card) => card.id),
    ).toEqual(["0", "1", "2", "3", "4"]);
    expect(buildTodayPracticeQueue(cards, -1)).toEqual([]);
  });

  it("uses local calendar days for Vietnamese due labels", () => {
    const now = new Date(2026, 8, 7, 23, 30).getTime();
    expect(practiceDueLabel(now, now)).toBe("Ôn ngay");
    expect(practiceDueLabel(now + 10 * 60_000, now)).toBe("Ôn sau");
    expect(practiceDueLabel(new Date(2026, 8, 8, 8).getTime(), now)).toBe(
      "Ôn ngày mai",
    );
    expect(practiceDueLabel(new Date(2026, 8, 9, 8).getTime(), now)).toBe(
      "Ôn sau",
    );
  });

  it("rejects invalid saved positions, lines, counts and tags without losing valid cards", () => {
    const card = ingestReviewMoment([], moment(), "h0g2", 1000)[0];
    const corrupt = [
      { ...card, rootFen: "broken" },
      { ...card, side: "b" },
      { ...card, bestLine: ["h0g2"] },
      { ...card, bestLine: ["b0c2", "b0c2"] },
      { ...card, successes: 99 },
      { ...card, attempts: -1 },
      { ...card, tags: ["made-up"] },
      { ...card, lastAttemptKind: "invented" },
    ];
    expect(parsePracticeCards(JSON.stringify([...corrupt, card]))).toEqual([
      card,
    ]);
  });

  it("fails closed when storage is malformed", () => {
    expect(parsePracticeCards("not json")).toEqual([]);
    expect(parsePracticeCards(JSON.stringify([{ id: "broken" }]))).toEqual([]);
  });
});
