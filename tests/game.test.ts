import { describe, expect, it } from "vitest";
import { describeMove, position, START_FEN } from "../src/chess";
import {
  canUndoGame,
  createGame,
  gameOutcome,
  parseLocalGame,
  playGameMove,
  positionOutcome,
  resignGame,
  undoGame,
} from "../src/game";

describe("full local game", () => {
  it("names both Red and Black moves from canonical board pieces", () => {
    expect(describeMove(START_FEN, "h2e2")).toBe("Pháo h2 → e2");
    expect(describeMove(position(START_FEN, ["h2e2"]).fen(), "h9g7")).toBe(
      "Mã h9 → g7",
    );
  });
  it("enforces human/engine ownership for either chosen side", () => {
    for (const side of ["r", "b"] as const) {
      const game = createGame(side);
      const first = side === "r" ? "human" : "engine";
      expect(() =>
        playGameMove(game, "h2e2", first === "human" ? "engine" : "human"),
      ).toThrow();
      const next = playGameMove(game, "h2e2", first);
      expect(next.moves).toEqual(["h2e2"]);
      expect(game.moves).toEqual([]);
      expect(() => playGameMove(next, "b2e2", first)).toThrow();
      expect(() => playGameMove(game, "a0a9", first)).toThrow();
    }
  });
  it("undo returns to the last human decision, including pending engine turns", () => {
    let red = playGameMove(createGame(), "h2e2", "human");
    expect(undoGame(red).moves).toEqual([]);
    red = playGameMove(red, "h9g7", "engine");
    expect(undoGame(red).moves).toEqual([]);
    let black = playGameMove(createGame("b"), "h2e2", "engine");
    expect(canUndoGame(black)).toBe(false);
    black = playGameMove(black, "h9g7", "human");
    black = playGameMove(black, "h0g2", "engine");
    expect(undoGame(black).moves).toEqual(["h2e2"]);
    expect(position(START_FEN, undoGame(black).moves).turn()).toBe("b");
  });
  it("challenge disallows undo and resignation cannot be undone or followed by moves", () => {
    const challenge = playGameMove(
      createGame("r", "challenge"),
      "h2e2",
      "human",
    );
    expect(() => undoGame(challenge)).toThrow();
    const ended = resignGame(challenge);
    expect(gameOutcome(ended)).toEqual({ kind: "resigned", winner: "b" });
    expect(() => playGameMove(ended, "h9g7", "engine")).toThrow();
    expect(() => undoGame(ended)).toThrow();
    expect(parseLocalGame(JSON.stringify(ended))).toEqual(ended);
  });
  it("repetition pauses without inventing a draw and rejects subsequent persisted moves", () => {
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
    const saved = { ...createGame(), moves };
    expect(gameOutcome(saved)).toEqual({ kind: "repetition-unsupported" });
    expect(parseLocalGame(JSON.stringify(saved))).toEqual(saved);
    expect(
      parseLocalGame(JSON.stringify({ ...saved, moves: [...moves, "h2e2"] })),
    ).toBeNull();
    expect(() => playGameMove(saved, "h2e2", "human")).toThrow();
    expect(gameOutcome(undoGame(saved)).kind).toBe("active");
  });
  it("stalemate is a loss and check is an active constraint", () => {
    expect(
      positionOutcome(
        "3aca3/1Cnrk4/b3r4/2p1n4/2b6/9/9/9/4C4/ppppcK3 b - - 0 1",
      ),
    ).toEqual({ kind: "stalemate", winner: "r" });
    expect(positionOutcome("4k4/9/9/9/4p4/9/9/9/4r4/4K4 r - - 0 1")).toEqual({
      kind: "active",
      check: true,
    });
  });
  it("rejects corrupt storage, forged results and overlong histories", () => {
    for (const value of [
      null,
      "{",
      "[]",
      JSON.stringify({ ...createGame(), humanSide: "w" }),
      JSON.stringify({ ...createGame(), moves: [null] }),
      JSON.stringify({ ...createGame(), moves: ["a0a9"] }),
      JSON.stringify({ ...createGame(), moves: Array(301).fill("h2e2") }),
    ])
      expect(parseLocalGame(value)).toBeNull();
    const game = playGameMove(createGame("b"), "h2e2", "engine");
    expect(parseLocalGame(JSON.stringify({ ...game, winner: "b" }))).toEqual(
      game,
    );
  });
});
