import { describe, expect, it } from "vitest";
import { START_FEN } from "../src/chess";
import {
  appendLegalMove,
  canHumanMove,
  currentSnapshot,
  isAiTurn,
  moveListRows,
  resultLabel,
  undoToHumanTurn,
} from "../src/gameSession";

describe("full-game session boundaries", () => {
  it("gives Red the first turn and lets Black-human wait for the AI opening", () => {
    expect(currentSnapshot([]).turn).toBe("r");
    expect(canHumanMove([], "r", false)).toBe(true);
    expect(canHumanMove([], "b", false)).toBe(false);
    expect(isAiTurn([], "b")).toBe(true);
    expect(isAiTurn([], "r")).toBe(false);
  });

  it("accepts only deterministic legal moves and switches ownership", () => {
    const afterRed = appendLegalMove([], "h2e2");
    expect(afterRed).toEqual(["h2e2"]);
    expect(currentSnapshot(afterRed).turn).toBe("b");
    expect(canHumanMove(afterRed, "r", false)).toBe(false);
    expect(isAiTurn(afterRed, "r")).toBe(true);
    expect(() => appendLegalMove([], "a0a9")).toThrow(/hợp lệ/);
  });

  it("blocks the human while an engine reply is pending", () => {
    expect(canHumanMove([], "r", true)).toBe(false);
  });

  it("undoes a completed pair back to the human turn", () => {
    const moves = ["h2e2", "h7e7", "b2e2", "b7e7"];
    expect(undoToHumanTurn(moves, "r")).toEqual(["h2e2", "h7e7"]);
    expect(undoToHumanTurn(["h2e2"], "r")).toEqual([]);
  });

  it("formats a stable two-column move list", () => {
    expect(moveListRows(["h2e2", "h7e7", "b2e2"])).toEqual([
      { number: 1, red: "h2e2", black: "h7e7" },
      { number: 2, red: "b2e2", black: null },
    ]);
  });

  it("treats no-legal-move stalemate as a loss, matching the vendored rules", () => {
    const fen = "3aca3/1Cnrk4/b3r4/2p1n4/2b6/9/9/9/4C4/ppppcK3 b - - 0 1";
    const snapshot = currentSnapshot([], fen);
    expect(snapshot.phase).toBe("finished");
    expect(snapshot.result).toEqual({
      kind: "stalemate",
      winner: "r",
      loser: "b",
    });
    expect(resultLabel(snapshot.result)).toContain("Đỏ thắng");
    expect(() => appendLegalMove([], "e8e7", fen)).toThrow(/kết thúc/);
  });

  it("does not present threefold repetition as full WXF adjudication", () => {
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
    const snapshot = currentSnapshot(moves, START_FEN);
    expect(snapshot.result).toEqual({ kind: "draw", reason: "repetition" });
    expect(resultLabel(snapshot.result)).toContain("trường chiếu/trường tróc");
  });
});
