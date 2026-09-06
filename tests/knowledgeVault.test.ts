import { describe, expect, it } from "vitest";
import {
  KNOWLEDGE_SOURCES,
  findKnowledgeSources,
  knowledgeCoverage,
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
});
