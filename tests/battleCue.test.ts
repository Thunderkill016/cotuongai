import { describe, expect, it } from "vitest";
import { deriveBattleCue } from "../src/battleCue";
import { EXERCISES } from "../src/training";

describe("deterministic 3D battle cues", () => {
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
