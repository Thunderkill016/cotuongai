import { describe, expect, it } from "vitest";
import { CURRICULUM_SKILLS, getSkill, unlockedSkills } from "../src/curriculum";

describe("curriculum skill graph", () => {
  it("uses unique skill ids and valid prerequisites", () => {
    const ids = new Set(CURRICULUM_SKILLS.map((skill) => skill.id));
    expect(ids.size).toBe(CURRICULUM_SKILLS.length);
    for (const skill of CURRICULUM_SKILLS)
      for (const prerequisite of skill.prerequisites)
        expect(getSkill(prerequisite), `${skill.id} -> ${prerequisite}`).toBeDefined();
  });

  it("unlocks foundation skills before dependent skills", () => {
    const initial = unlockedSkills(new Set()).map((skill) => skill.id);
    expect(initial).toContain("rules-piece-movement");
    expect(initial).not.toContain("rules-check-evasion");

    const afterMovement = unlockedSkills(new Set(["rules-piece-movement"]))
      .map((skill) => skill.id);
    expect(afterMovement).toContain("rules-check-evasion");
    expect(afterMovement).toContain("tactics-recapture");
    expect(afterMovement).toContain("opening-principles");
  });

  it("keeps Vietnamese Xiangqi terms attached to every skill", () => {
    for (const skill of CURRICULUM_SKILLS) {
      expect(skill.vietnameseTerms.length).toBeGreaterThan(0);
      expect(skill.outcome.length).toBeGreaterThan(10);
    }
  });
});
