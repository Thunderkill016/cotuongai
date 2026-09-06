import {
  practiceTagLabel,
  type GamePracticeCard,
  type PracticeTag,
} from "./practiceMemory";

export type PatternEvidenceLevel = "single" | "repeated" | "recurring";

export interface PracticePatternSummary {
  tag: PracticeTag;
  label: string;
  positions: number;
  negativePositions: number;
  majorMissPositions: number;
  failedAttempts: number;
  duePositions: number;
  evidence: PatternEvidenceLevel;
  score: number;
}

export interface PracticeEvidenceProfile {
  totalPositions: number;
  totalAttempts: number;
  patterns: PracticePatternSummary[];
  sample: "empty" | "sparse" | "growing" | "broader";
}

function reviewWeight(card: GamePracticeCard): number {
  switch (card.reviewKind) {
    case "major-miss":
      return 4;
    case "improvement":
      return 2;
    case "alternative":
      return 1;
    case "good-find":
      return 0;
  }
}

function evidenceLevel(
  positions: number,
  negativePositions: number,
  failedAttempts: number,
): PatternEvidenceLevel {
  // Do not turn one observation into a personal weakness claim.
  if (positions >= 3 && (negativePositions >= 2 || failedAttempts >= 2))
    return "recurring";
  if (positions >= 2) return "repeated";
  return "single";
}

function sampleLevel(total: number): PracticeEvidenceProfile["sample"] {
  if (total === 0) return "empty";
  if (total < 3) return "sparse";
  if (total < 8) return "growing";
  return "broader";
}

export function summarizePracticePatterns(
  cards: GamePracticeCard[],
  now: number = Date.now(),
): PracticeEvidenceProfile {
  const unique = new Map(cards.map((card) => [card.fingerprint, card]));
  const values = [...unique.values()];
  const tags = new Map<PracticeTag, GamePracticeCard[]>();

  for (const card of values) {
    for (const tag of new Set(card.tags)) {
      const list = tags.get(tag) ?? [];
      list.push(card);
      tags.set(tag, list);
    }
  }

  const patterns = [...tags.entries()].map(([tag, tagged]) => {
    const negativePositions = tagged.filter(
      (card) => card.reviewKind !== "good-find",
    ).length;
    const majorMissPositions = tagged.filter(
      (card) => card.reviewKind === "major-miss",
    ).length;
    const failedAttempts = tagged.reduce(
      (sum, card) => sum + Math.max(0, card.attempts - card.successes),
      0,
    );
    const duePositions = tagged.filter((card) => card.dueAt <= now).length;
    const score = tagged.reduce((sum, card) => sum + reviewWeight(card), 0) +
      Math.min(failedAttempts, 6) +
      duePositions;

    return {
      tag,
      label: practiceTagLabel(tag),
      positions: tagged.length,
      negativePositions,
      majorMissPositions,
      failedAttempts,
      duePositions,
      evidence: evidenceLevel(
        tagged.length,
        negativePositions,
        failedAttempts,
      ),
      score,
    } satisfies PracticePatternSummary;
  });

  patterns.sort((a, b) => {
    const evidenceRank = { recurring: 3, repeated: 2, single: 1 } as const;
    return (
      evidenceRank[b.evidence] - evidenceRank[a.evidence] ||
      b.score - a.score ||
      b.positions - a.positions ||
      a.label.localeCompare(b.label, "vi")
    );
  });

  return {
    totalPositions: values.length,
    totalAttempts: values.reduce((sum, card) => sum + card.attempts, 0),
    patterns,
    sample: sampleLevel(values.length),
  };
}

export function patternEvidenceLabel(pattern: PracticePatternSummary): string {
  switch (pattern.evidence) {
    case "recurring":
      return "Dấu hiệu lặp lại";
    case "repeated":
      return "Đã xuất hiện hơn một lần";
    case "single":
      return "Mới có một quan sát";
  }
}

export function profileSampleNote(
  sample: PracticeEvidenceProfile["sample"],
): string {
  switch (sample) {
    case "empty":
      return "Chưa có dữ liệu từ ván đã review.";
    case "sparse":
      return "Dữ liệu còn rất ít; chưa đủ để gọi bất kỳ motif nào là điểm yếu ổn định.";
    case "growing":
      return "Đã có vài thế để thấy tín hiệu ban đầu, nhưng vẫn cần thêm ván để kết luận chắc hơn.";
    case "broader":
      return "Mẫu đã rộng hơn; các mục lặp lại vẫn chỉ là evidence từ những ván đã lưu, không phải đánh giá trình độ tổng quát.";
  }
}
