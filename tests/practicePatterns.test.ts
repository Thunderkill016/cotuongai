import { describe, expect, it } from "vitest";
import { START_FEN } from "../src/chess";
import type { GamePracticeCard, PracticeTag } from "../src/practiceMemory";
import {
  profileSampleNote,
  summarizePracticePatterns,
} from "../src/practicePatterns";

function card(
  id: string,
  tags: PracticeTag[],
  overrides: Partial<GamePracticeCard> = {},
): GamePracticeCard {
  return {
    id,
    fingerprint: id,
    source: "postgame-review",
    rootFen: START_FEN,
    side: "r",
    sourcePly: 0,
    playedMove: "h0g2",
    bestmove: "b0c2",
    bestLine: ["b0c2", "b9c7"],
    reviewKind: "improvement",
    lossCp: 120,
    tags,
    engineBuild: "test-engine",
    engineBudgetMs: 1200,
    createdAt: 1,
    updatedAt: 1,
    dueAt: 10,
    attempts: 1,
    successes: 0,
    consecutiveSuccesses: 0,
    lastAttemptAt: 1,
    lastMove: "h0g2",
    lastOutcome: "missed",
    ...overrides,
  };
}

describe("practice evidence profile", () => {
  it("never labels one stored position as a recurring signal", () => {
    const profile = summarizePracticePatterns([card("one", ["horse"])], 20);
    expect(profile.patterns[0]).toMatchObject({
      tag: "horse",
      positions: 1,
      evidence: "single",
    });
    expect(profileSampleNote(profile.sample)).toContain("chưa đủ");
  });

  it("requires multiple distinct positions before calling a signal recurring", () => {
    const profile = summarizePracticePatterns(
      [
        card("a", ["horse", "capture"], { reviewKind: "major-miss" }),
        card("b", ["horse"], { reviewKind: "improvement" }),
        card("c", ["horse"], { reviewKind: "good-find", successes: 1 }),
      ],
      20,
    );
    const horse = profile.patterns.find((item) => item.tag === "horse");
    expect(horse).toMatchObject({
      positions: 3,
      negativePositions: 2,
      evidence: "recurring",
    });
  });

  it("keeps two observations at repeated rather than recurring", () => {
    const profile = summarizePracticePatterns(
      [card("a", ["cannon"]), card("b", ["cannon"])],
      20,
    );
    expect(profile.patterns[0].evidence).toBe("repeated");
  });

  it("deduplicates the same fingerprint before counting positions", () => {
    const original = card("same", ["rook"]);
    const newer = { ...original, id: "newer", attempts: 4, successes: 1 };
    const profile = summarizePracticePatterns([original, newer], 20);
    expect(profile.totalPositions).toBe(1);
    expect(profile.patterns[0].positions).toBe(1);
    expect(profile.patterns[0].failedAttempts).toBe(3);
  });

  it("orders recurring and more severe evidence ahead of incidental good finds", () => {
    const profile = summarizePracticePatterns(
      [
        card("h1", ["horse"], { reviewKind: "major-miss" }),
        card("h2", ["horse"], { reviewKind: "major-miss" }),
        card("h3", ["horse"], { reviewKind: "improvement" }),
        card("p1", ["pawn"], {
          reviewKind: "good-find",
          successes: 1,
          lastOutcome: "correct",
        }),
      ],
      20,
    );
    expect(profile.patterns[0].tag).toBe("horse");
    expect(profile.patterns[0].majorMissPositions).toBe(2);
  });
});
