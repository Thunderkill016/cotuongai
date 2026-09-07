import { describe, expect, it } from "vitest";
import {
  checkedGeneral,
  deriveBattleCue,
  fitBoardDistance,
  horsePaths,
  isBoardTap,
  transitionCue,
} from "../src/battleCue";
import { position, START_FEN } from "../src/chess";
import { EXERCISES } from "../src/training";

describe("deterministic 3D battle cues", () => {
  it("only animates a verified consecutive move, never a replay jump", () => {
    const after = position(START_FEN, ["h2e2"]).fen();
    expect(transitionCue(START_FEN, after, "h2e2")?.mover).toBe("c");
    expect(transitionCue(null, after, "h2e2")).toBeNull();
    expect(transitionCue(START_FEN, START_FEN, "h2e2")).toBeNull();
    expect(
      transitionCue(
        START_FEN,
        position(START_FEN, ["h2e2", "h9g7"]).fen(),
        "h9g7",
      ),
    ).toBeNull();
    expect(() => deriveBattleCue(START_FEN, "h2h2")).toThrow();
  });
  it("shows blocked horse legs separately from legal destinations", () => {
    const paths = horsePaths("4k4/9/9/9/4p4/9/9/2R6/2N6/4K4 r - - 0 1", "c1");
    expect(paths.find((path) => path.to === "d3")).toMatchObject({
      leg: "c2",
      blocked: true,
      legal: false,
    });
    expect(paths.find((path) => path.to === "e2")).toMatchObject({
      leg: "d1",
      blocked: false,
      legal: true,
    });
    expect(horsePaths(START_FEN, "h2")).toEqual([]);
  });
  it("locates the checked general from the current rules state", () => {
    expect(checkedGeneral(START_FEN)).toBeNull();
    expect(checkedGeneral("4k4/9/9/9/4p4/9/9/9/4r4/4K4 r - - 0 1")).toBe("e0");
  });
  it("rejects camera drags and fits a narrower screen farther out", () => {
    expect(isBoardTap({ x: 100, y: 100 }, { x: 102, y: 101 })).toBe(true);
    expect(isBoardTap({ x: 100, y: 100 }, { x: 110, y: 100 })).toBe(false);
    expect(isBoardTap(null, { x: 100, y: 100 })).toBe(false);
    expect(fitBoardDistance(0.7, 38)).toBeGreaterThan(
      fitBoardDistance(1.4, 38),
    );
  });
  it("finds the cannon screen and capture without inventing it in the renderer", () => {
    const cue = deriveBattleCue(EXERCISES[1].fen, "h2h7");
    expect(cue.kind).toBe("cannon-shot");
    expect(cue.capture).toBe(true);
    expect(cue.captured).toBe("r");
    expect(cue.cannonScreenSquare).toBe("h4");
  });

  it("distinguishes a cavalry capture from an ordinary move", () => {
    const capture = deriveBattleCue(EXERCISES[2].fen, "c1d3");
    expect(capture.kind).toBe("cavalry-strike");
    expect(capture.capture).toBe(true);

    const quiet = deriveBattleCue(
      "4k4/9/9/9/4p4/9/9/9/2N6/3K5 r - - 0 1",
      "c1e2",
    );
    expect(quiet.kind).toBe("move");
    expect(quiet.capture).toBe(false);
  });

  it("derives check and the threatened general square after the legal move", () => {
    const cue = deriveBattleCue("4k4/9/9/9/9/9/9/9/9/R4K3 r - - 0 1", "a0e0");
    expect(cue.givesCheck).toBe(true);
    expect(cue.checkedKingSquare).toBe("e9");
  });

  it("fails closed on malformed or illegal moves", () => {
    expect(() => deriveBattleCue(EXERCISES[0].fen, "oops")).toThrow();
    expect(() => deriveBattleCue(EXERCISES[0].fen, "a0a9")).toThrow();
  });
});
