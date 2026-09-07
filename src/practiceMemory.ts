import { position } from "./chess";
import { ENGINE_BUILD, SEARCH_MS } from "./engine";
import type { ReviewMoment, ReviewMomentKind } from "./gameReview";

export const GAME_PRACTICE_STORAGE_KEY = "ky-lo.game-practice.v1";
export const MAX_GAME_PRACTICE_CARDS = 300;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export type PracticeTag =
  | "check"
  | "capture"
  | "cannon"
  | "rook"
  | "horse"
  | "pawn"
  | "advisor"
  | "elephant"
  | "general";

export type PracticeOutcome = "correct" | "missed";

export interface GamePracticeCard {
  id: string;
  fingerprint: string;
  source: "postgame-review";
  rootFen: string;
  side: "r" | "b";
  sourcePly: number;
  playedMove: string;
  bestmove: string;
  bestLine: string[];
  reviewKind: ReviewMomentKind;
  lossCp: number | null;
  tags: PracticeTag[];
  engineBuild: string;
  engineBudgetMs: number;
  createdAt: number;
  updatedAt: number;
  dueAt: number;
  attempts: number;
  successes: number;
  consecutiveSuccesses: number;
  lastAttemptAt: number | null;
  lastMove: string | null;
  lastOutcome: PracticeOutcome | null;
  lastAttemptKind?: "first" | "scheduled" | "repeated";
}

function hash(value: string): string {
  let state = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    state ^= value.charCodeAt(index);
    state = Math.imul(state, 0x01000193);
  }
  return (state >>> 0).toString(36);
}

function fingerprintFor(moment: ReviewMoment): string {
  return [
    moment.candidate.rootFen,
    moment.candidate.move,
    moment.bestmove,
    ENGINE_BUILD,
  ].join("|");
}

function moverTag(
  type: ReviewMoment["candidate"]["cue"]["mover"],
): PracticeTag {
  switch (type) {
    case "c":
      return "cannon";
    case "r":
      return "rook";
    case "n":
      return "horse";
    case "p":
      return "pawn";
    case "a":
      return "advisor";
    case "b":
      return "elephant";
    case "k":
      return "general";
  }
}

export function tagsForReviewMoment(moment: ReviewMoment): PracticeTag[] {
  const tags = new Set<PracticeTag>([moverTag(moment.candidate.cue.mover)]);
  if (moment.candidate.cue.capture) tags.add("capture");
  if (moment.candidate.cue.givesCheck) tags.add("check");
  if (moment.candidate.cue.kind === "cannon-shot") tags.add("cannon");
  return [...tags];
}

function successIntervalMs(card: GamePracticeCard, nextStreak: number): number {
  // Heuristic spacing only. It is deliberately not presented as a validated
  // learning-science effect size for Xiangqi.
  if (card.reviewKind === "good-find" && nextStreak === 1) return 7 * DAY;
  return [DAY, 3 * DAY, 7 * DAY, 14 * DAY][
    Math.min(Math.max(nextStreak - 1, 0), 3)
  ];
}

export function recordPracticeAttempt(
  card: GamePracticeCard,
  move: string,
  at: number = Date.now(),
): GamePracticeCard {
  if (!/^[a-i][0-9][a-i][0-9]$/.test(move))
    throw new Error("Nước ôn lại không đúng định dạng.");
  if (!position(card.rootFen).moves().includes(move))
    throw new Error("Nước ôn lại không hợp lệ trong thế đã lưu.");

  const correct = move === card.bestmove;
  if (!Number.isFinite(at) || at < card.updatedAt)
    throw new Error("Thời điểm ôn không hợp lệ.");
  const repeated = card.attempts > 0 && at < card.dueAt;
  const nextStreak = correct ? card.consecutiveSuccesses + 1 : 0;
  const interval = correct ? successIntervalMs(card, nextStreak) : 4 * HOUR;

  return {
    ...card,
    updatedAt: at,
    dueAt: repeated ? card.dueAt : at + interval,
    attempts: card.attempts + 1,
    successes: card.successes + (correct ? 1 : 0),
    consecutiveSuccesses: repeated ? card.consecutiveSuccesses : nextStreak,
    lastAttemptAt: at,
    lastMove: move,
    lastOutcome: correct ? "correct" : "missed",
    lastAttemptKind:
      card.attempts === 0 ? "first" : repeated ? "repeated" : "scheduled",
  };
}

function freshCard(moment: ReviewMoment, at: number): GamePracticeCard {
  const fingerprint = fingerprintFor(moment);
  return {
    id: `game-${hash(fingerprint)}`,
    fingerprint,
    source: "postgame-review",
    rootFen: moment.candidate.rootFen,
    side: moment.candidate.side,
    sourcePly: moment.candidate.ply,
    playedMove: moment.candidate.move,
    bestmove: moment.bestmove,
    bestLine: moment.bestLine.slice(0, 8),
    reviewKind: moment.kind,
    lossCp: moment.lossCp,
    tags: tagsForReviewMoment(moment),
    engineBuild: ENGINE_BUILD,
    engineBudgetMs: SEARCH_MS,
    createdAt: at,
    updatedAt: at,
    dueAt: at,
    attempts: 0,
    successes: 0,
    consecutiveSuccesses: 0,
    lastAttemptAt: null,
    lastMove: null,
    lastOutcome: null,
  };
}

export function ingestReviewMoment(
  cards: GamePracticeCard[],
  moment: ReviewMoment,
  retryMove: string,
  at: number = Date.now(),
): GamePracticeCard[] {
  const incoming = freshCard(moment, at);
  const existing = cards.find(
    (card) => card.fingerprint === incoming.fingerprint,
  );
  const base = existing
    ? {
        ...existing,
        rootFen: incoming.rootFen,
        side: incoming.side,
        sourcePly: incoming.sourcePly,
        playedMove: incoming.playedMove,
        bestmove: incoming.bestmove,
        bestLine: incoming.bestLine,
        reviewKind: incoming.reviewKind,
        lossCp: incoming.lossCp,
        tags: incoming.tags,
        engineBuild: incoming.engineBuild,
        engineBudgetMs: incoming.engineBudgetMs,
        updatedAt: at,
      }
    : incoming;
  const attempted = recordPracticeAttempt(base, retryMove, at);
  const merged = cards.filter(
    (card) => card.fingerprint !== incoming.fingerprint,
  );
  return [...merged, attempted]
    .sort((a, b) => a.updatedAt - b.updatedAt)
    .slice(-MAX_GAME_PRACTICE_CARDS);
}

function severity(kind: ReviewMomentKind): number {
  switch (kind) {
    case "major-miss":
      return 4;
    case "improvement":
      return 3;
    case "alternative":
      return 2;
    case "good-find":
      return 1;
  }
}

export function buildTodayPracticeQueue(
  cards: GamePracticeCard[],
  now: number = Date.now(),
  limit = 5,
): GamePracticeCard[] {
  if (!Number.isInteger(limit) || limit < 1)
    throw new Error("Giới hạn buổi ôn không hợp lệ.");
  return [...new Map(cards.map((card) => [card.id, card])).values()]
    .filter((card) => card.dueAt <= now)
    .sort(
      (a, b) =>
        a.dueAt - b.dueAt || severity(b.reviewKind) - severity(a.reviewKind),
    )
    .slice(0, limit);
}

export function practiceDueLabel(dueAt: number, now: number): string {
  if (dueAt <= now) return "Ôn ngay";
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const due = new Date(dueAt);
  return due.toDateString() === tomorrow.toDateString()
    ? "Ôn ngày mai"
    : "Ôn sau";
}

export function duePracticeCount(
  cards: GamePracticeCard[],
  now: number = Date.now(),
): number {
  return cards.filter((card) => card.dueAt <= now).length;
}

function isUci(value: unknown): value is string {
  return typeof value === "string" && /^[a-i][0-9][a-i][0-9]$/.test(value);
}

function hasCardFields(value: unknown): value is GamePracticeCard {
  if (!value || typeof value !== "object") return false;
  const card = value as Partial<GamePracticeCard>;
  return (
    typeof card.id === "string" &&
    typeof card.fingerprint === "string" &&
    card.source === "postgame-review" &&
    typeof card.rootFen === "string" &&
    (card.side === "r" || card.side === "b") &&
    Number.isInteger(card.sourcePly) &&
    isUci(card.playedMove) &&
    isUci(card.bestmove) &&
    Array.isArray(card.bestLine) &&
    card.bestLine.every(isUci) &&
    ["major-miss", "improvement", "alternative", "good-find"].includes(
      card.reviewKind ?? "",
    ) &&
    (card.lossCp === null || typeof card.lossCp === "number") &&
    Array.isArray(card.tags) &&
    typeof card.engineBuild === "string" &&
    typeof card.engineBudgetMs === "number" &&
    typeof card.createdAt === "number" &&
    typeof card.updatedAt === "number" &&
    typeof card.dueAt === "number" &&
    typeof card.attempts === "number" &&
    typeof card.successes === "number" &&
    typeof card.consecutiveSuccesses === "number" &&
    (card.lastAttemptAt === null || typeof card.lastAttemptAt === "number") &&
    (card.lastMove === null || isUci(card.lastMove)) &&
    (card.lastOutcome === null ||
      card.lastOutcome === "correct" ||
      card.lastOutcome === "missed")
  );
}

function isCard(value: unknown): value is GamePracticeCard {
  if (!hasCardFields(value)) return false;
  const card = value;
  const counts = [
    card.sourcePly,
    card.attempts,
    card.successes,
    card.consecutiveSuccesses,
  ];
  const times = [
    card.createdAt,
    card.updatedAt,
    card.dueAt,
    card.engineBudgetMs,
  ];
  if (
    counts.some((n) => !Number.isSafeInteger(n) || n < 0) ||
    times.some((n) => !Number.isFinite(n) || n < 0) ||
    card.successes > card.attempts ||
    card.consecutiveSuccesses > card.successes ||
    (card.lossCp !== null &&
      (!Number.isFinite(card.lossCp) || card.lossCp < 0)) ||
    (card.lastAttemptAt !== null &&
      (!Number.isFinite(card.lastAttemptAt) || card.lastAttemptAt < 0)) ||
    card.bestLine.length === 0 ||
    card.bestLine.length > 8 ||
    card.bestLine[0] !== card.bestmove ||
    !card.tags.every((tag) =>
      [
        "check",
        "capture",
        "cannon",
        "rook",
        "horse",
        "pawn",
        "advisor",
        "elephant",
        "general",
      ].includes(tag),
    ) ||
    (card.lastAttemptKind !== undefined &&
      !["first", "scheduled", "repeated"].includes(card.lastAttemptKind))
  )
    return false;
  // Browser storage is untrusted. Validate the actual position and sequential line
  // before any view can replay it, while preserving other valid cards.
  try {
    const game = position(card.rootFen);
    if (
      game.turn() !== card.side ||
      !game.moves().includes(card.playedMove) ||
      (card.lastMove !== null && !game.moves().includes(card.lastMove))
    )
      return false;
    position(card.rootFen, card.bestLine);
    return true;
  } catch {
    return false;
  }
}

export function parsePracticeCards(raw: string | null): GamePracticeCard[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(isCard)
    .sort((a, b) => a.updatedAt - b.updatedAt)
    .slice(-MAX_GAME_PRACTICE_CARDS);
}

export function reviewKindLabel(kind: ReviewMomentKind): string {
  switch (kind) {
    case "major-miss":
      return "Nước cần tính lại kỹ";
    case "improvement":
      return "Có nước mạnh hơn đáng kể";
    case "alternative":
      return "Phương án đáng so sánh";
    case "good-find":
      return "Nước tốt cần giữ được";
  }
}

export function practiceTagLabel(tag: PracticeTag): string {
  switch (tag) {
    case "check":
      return "chiếu Tướng";
    case "capture":
      return "ăn quân";
    case "cannon":
      return "Pháo";
    case "rook":
      return "Xe";
    case "horse":
      return "Mã";
    case "pawn":
      return "Tốt";
    case "advisor":
      return "Sĩ";
    case "elephant":
      return "Tượng";
    case "general":
      return "Tướng";
  }
}
