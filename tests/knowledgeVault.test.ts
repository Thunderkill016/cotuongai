import { describe, expect, it } from "vitest";
import {
  KNOWLEDGE_SOURCES,
  OPENING_FAMILIES,
  PLAYABLE_KNOWLEDGE_POSITIONS,
  findKnowledgeSources,
  knowledgeCoverage,
  openingFamilyIssues,
  playableKnowledgePosition,
  playablePositionIssues,
} from "../src/knowledgeVault";

describe("Xiangqi knowledge vault", () => {
  it("has unique source ids", () => {
    const ids = KNOWLEDGE_SOURCES.map((source) => source.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does not treat lost sources as directly reusable text", () => {
    for (const source of KNOWLEDGE_SOURCES.filter(
      (item) => item.rights === "lost-source",
    )) {
      expect(source.status).toBe("reconstructed");
      expect(source.url).toBeUndefined();
    }
  });

  it("keeps modern theory reference-only", () => {
    const modern = KNOWLEDGE_SOURCES.filter((source) =>
      source.kind.includes("modern-theory"),
    );
    expect(modern.length).toBeGreaterThan(0);
    expect(modern.every((source) => source.rights === "reference-only")).toBe(
      true,
    );
  });

  it("searches Vietnamese and Chinese titles/themes", () => {
    expect(findKnowledgeSources("Phản Cung Mã").length).toBeGreaterThan(0);
    expect(findKnowledgeSources("橘中秘").map((source) => source.id)).toContain(
      "ju-zhong-mi",
    );
  });

  it("covers opening, middlegame, endgame and compositions", () => {
    const coverage = knowledgeCoverage();
    expect(coverage.total).toBeGreaterThanOrEqual(15);
    expect(coverage.byKind.get("opening")).toBeGreaterThan(0);
    expect(coverage.byKind.get("middlegame")).toBeGreaterThan(0);
    expect(coverage.byKind.get("endgame")).toBeGreaterThan(0);
    expect(coverage.byKind.get("composition")).toBeGreaterThan(0);
  });

  it("keeps playable positions tied to a source, a legal line and clear rights", () => {
    expect(PLAYABLE_KNOWLEDGE_POSITIONS).toHaveLength(4);
    for (const item of PLAYABLE_KNOWLEDGE_POSITIONS) {
      expect(playablePositionIssues(item)).toEqual([]);
      expect(item.verified.engine).toBe(false);
      expect(item.rights).toBe("product-original");
    }
    expect(playableKnowledgePosition("cannon-screen")?.learning.solution).toBe(
      "h2h7",
    );
    expect(playableKnowledgePosition("missing")).toBeNull();
  });

  it("fails closed when a playable position loses its source or legal solution", () => {
    const original = PLAYABLE_KNOWLEDGE_POSITIONS[0];
    expect(
      playablePositionIssues({ ...original, sourceId: "unknown" }),
    ).toContain("source-rights");
    expect(
      playablePositionIssues({
        ...original,
        learning: { ...original.learning, solution: "a0a9" },
      }),
    ).toContain("solution-legality");
  });

  it("keeps opening introductions tied to opening sources and original teaching copy", () => {
    expect(OPENING_FAMILIES.map((item) => item.id)).toEqual([
      "phao-dau",
      "binh-phong-ma",
      "phan-cung-ma",
    ]);
    for (const item of OPENING_FAMILIES)
      expect(openingFamilyIssues(item)).toEqual([]);
  });

  it("fails closed when an opening loses its opening source", () => {
    expect(
      openingFamilyIssues({
        ...OPENING_FAMILIES[0],
        sourceIds: ["vietnamese-xiangqi-language"],
      }),
    ).toContain("source-opening");
  });
});
