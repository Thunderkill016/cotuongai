import { describe, expect, it } from "vitest";
import {
  buildRetrievalQueue,
  classifyAttempt,
  recommendNextPractice,
  reviewIntervalMs,
} from "../src/retrieval";
import { type Attempt } from "../src/training";

const attempt = (overrides: Partial<Attempt> = {}): Attempt => ({
  id: crypto.randomUUID(),
  exerciseId: "rook-open-file",
  move: "b0b3",
  success: true,
  hints: 0,
  revealed: false,
  ordinal: 1,
  at: 1_000_000,
  ...overrides,
});

describe("spaced retrieval", () => {
  it("classifies bounded learning evidence without inventing mastery", () => {
    expect(classifyAttempt(attempt())).toBe("independent-success");
    expect(classifyAttempt(attempt({ hints: 1 }))).toBe("assisted-success");
    expect(classifyAttempt(attempt({ revealed: true }))).toBe(
      "answer-revealed",
    );
    expect(
      classifyAttempt(
        attempt({ move: "b0b1", success: false, hints: 0, revealed: false }),
      ),
    ).toBe("missed-capture");
  });

  it("schedules failures sooner than assisted and independent success", () => {
    const failure = attempt({ move: "b0b1", success: false });
    const assisted = attempt({ hints: 1 });
    const independent = attempt();
    expect(reviewIntervalMs(failure, [failure])).toBe(10 * 60_000);
    expect(reviewIntervalMs(assisted, [assisted])).toBe(4 * 60 * 60_000);
    expect(reviewIntervalMs(independent, [independent])).toBe(24 * 60 * 60_000);
  });

  it("expands spacing after repeated independent retrieval", () => {
    const first = attempt({ id: "a", ordinal: 1, at: 1 });
    const second = attempt({ id: "b", ordinal: 2, at: 1 + 24 * 60 * 60_000 });
    const third = attempt({
      id: "c",
      ordinal: 3,
      at: 1 + 4 * 24 * 60 * 60_000,
    });
    expect(reviewIntervalMs(second, [first, second])).toBe(
      3 * 24 * 60 * 60_000,
    );
    expect(reviewIntervalMs(third, [first, second, third])).toBe(
      7 * 24 * 60 * 60_000,
    );
  });

  it("does not extend the due date for immediate repeats or duplicate records", () => {
    const first = attempt({ id: "first", at: 0 });
    const repeat = attempt({ id: "repeat", at: 1000, ordinal: 2 });
    expect(buildRetrievalQueue([repeat, first, first], 2000)[0].dueAt).toBe(
      24 * 60 * 60_000,
    );
    expect(reviewIntervalMs(repeat, [first, repeat])).toBe(24 * 60 * 60_000);
  });
  it("keeps the short reveal schedule when the answer is repeated immediately", () => {
    const revealed = attempt({ id: "reveal", at: 0, revealed: true });
    const repeat = attempt({ id: "repeat", at: 1000, ordinal: 2 });
    const queued = buildRetrievalQueue([revealed, repeat], 2000)[0];
    expect(queued.dueAt).toBe(30 * 60_000);
    expect(queued.kind).toBe("answer-revealed");
  });

  it("puts overdue review ahead of future review", () => {
    const failed = attempt({
      id: "failed",
      move: "b0b1",
      success: false,
      at: 0,
    });
    const fresh = attempt({
      id: "fresh",
      exerciseId: "cannon-screen",
      move: "h2h7",
      at: 20 * 60_000,
    });
    const queue = buildRetrievalQueue([failed, fresh], 30 * 60_000);
    expect(queue[0].exercise.id).toBe("rook-open-file");
    expect(queue[0].overdueMs).toBeGreaterThan(0);
  });

  it("falls back to unseen practice until a review is actually due", () => {
    const recent = attempt({ at: 0 });
    const next = recommendNextPractice([recent], {}, 30 * 60_000);
    expect(next.exercise.id).not.toBe("rook-open-file");
    expect(next.dueAt).toBeNull();
  });
});
