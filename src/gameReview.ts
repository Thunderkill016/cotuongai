import { deriveBattleCue, type BattleCue } from "./battleCue";
import { START_FEN, position, replay, type Side } from "./chess";
import type { Score } from "./engine";

export interface ReviewCandidate {
  ply: number;
  move: string;
  side: Side;
  history: string[];
  rootFen: string;
  cue: BattleCue;
  heuristic: number;
}

export interface ReviewEvidence {
  candidate: ReviewCandidate;
  bestmove: string;
  bestScore: Score;
  playedScore: Score;
  bestLine: string[];
  playedLine: string[];
  lossCp: number | null;
}

export type ReviewMomentKind =
  | "major-miss"
  | "improvement"
  | "alternative"
  | "good-find";

export interface ReviewMoment extends ReviewEvidence {
  kind: ReviewMomentKind;
}

function candidateHeuristic(cue: BattleCue): number {
  let score = 0;
  if (cue.givesCheck) score += 5;
  if (cue.capture) score += 3;
  if (cue.kind === "cannon-shot") score += 2;
  if (cue.kind === "cavalry-strike" || cue.kind === "chariot-charge")
    score += 1;
  return score;
}

export function planReviewCandidates(
  moves: string[],
  humanSide: Side,
  limit = 9,
  startFen = START_FEN,
): ReviewCandidate[] {
  if (!Number.isInteger(limit) || limit < 1)
    throw new Error("Giới hạn vị trí review không hợp lệ.");

  const candidates: ReviewCandidate[] = [];
  for (let ply = 0; ply < moves.length; ply++) {
    const history = moves.slice(0, ply);
    const root = position(startFen, history);
    if (root.turn() !== humanSide) continue;
    const rootFen = root.fen();
    const cue = deriveBattleCue(rootFen, moves[ply]);
    candidates.push({
      ply,
      move: moves[ply],
      side: humanSide,
      history,
      rootFen,
      cue,
      heuristic: candidateHeuristic(cue),
    });
  }

  if (candidates.length <= limit) return candidates;

  const selected = new Map<number, ReviewCandidate>();
  const tactical = [...candidates]
    .sort((a, b) => b.heuristic - a.heuristic || a.ply - b.ply)
    .slice(0, Math.min(4, limit));
  tactical.forEach((candidate) => selected.set(candidate.ply, candidate));

  const slots = limit - selected.size;
  if (slots > 0) {
    for (let index = 0; index < slots; index++) {
      const point =
        slots === 1
          ? Math.floor((candidates.length - 1) / 2)
          : Math.round((index * (candidates.length - 1)) / (slots - 1));
      selected.set(candidates[point].ply, candidates[point]);
    }
  }

  for (const candidate of candidates) {
    if (selected.size >= limit) break;
    selected.set(candidate.ply, candidate);
  }

  return [...selected.values()].sort((a, b) => a.ply - b.ply).slice(0, limit);
}

function scoreOrdinal(score: Score): number | null {
  if (score.bound !== "exact") return null;
  if (score.kind === "cp") return score.value;
  const distance = Math.min(99, Math.abs(score.value));
  return score.value >= 0 ? 100000 - distance * 100 : -100000 + distance * 100;
}

export function evaluationLossCp(best: Score, played: Score): number | null {
  const bestValue = scoreOrdinal(best);
  const playedValue = scoreOrdinal(played);
  if (bestValue === null || playedValue === null) return null;
  return Math.max(0, bestValue - playedValue);
}

export function classifyReviewMoment(
  evidence: ReviewEvidence,
): ReviewMomentKind {
  if (evidence.bestmove === evidence.candidate.move) return "good-find";
  if (evidence.lossCp !== null && evidence.lossCp >= 250) return "major-miss";
  if (evidence.lossCp !== null && evidence.lossCp >= 80) return "improvement";
  return "alternative";
}

export function selectReviewMoments(
  evidence: ReviewEvidence[],
  min = 3,
  max = 7,
): ReviewMoment[] {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min)
    throw new Error("Giới hạn review không hợp lệ.");

  const moments = evidence.map((item) => ({
    ...item,
    kind: classifyReviewMoment(item),
  }));

  const priority = (item: ReviewMoment) => {
    const kind =
      item.kind === "major-miss"
        ? 4
        : item.kind === "improvement"
          ? 3
          : item.kind === "alternative"
            ? 2
            : 1;
    return (
      kind * 1_000_000 + (item.lossCp ?? 0) * 100 + item.candidate.heuristic
    );
  };

  const ranked = [...moments].sort(
    (a, b) => priority(b) - priority(a) || a.candidate.ply - b.candidate.ply,
  );
  const selected = ranked.slice(0, Math.min(max, ranked.length));

  // Do not manufacture mistakes just to hit a quota. If a game has fewer than
  // `min` engine disagreements, good decisions can fill the learning set and are
  // explicitly labelled as such.
  if (selected.length < Math.min(min, moments.length)) {
    for (const moment of ranked) {
      if (selected.some((item) => item.candidate.ply === moment.candidate.ply))
        continue;
      selected.push(moment);
      if (selected.length >= Math.min(min, moments.length)) break;
    }
  }

  return selected.sort((a, b) => a.candidate.ply - b.candidate.ply);
}

export function reviewFen(moment: ReviewMoment): string {
  return replay(moment.candidate.rootFen, []);
}
