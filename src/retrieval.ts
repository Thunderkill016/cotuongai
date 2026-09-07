import { inspectMove } from "./chess";
import {
  EXERCISES,
  recommendExercise,
  type Attempt,
  type Exposures,
  type Exercise,
} from "./training";

export type MistakeKind =
  | "missed-capture"
  | "unsafe-capture"
  | "answer-revealed"
  | "assisted-success"
  | "independent-success";

export interface RetrievalItem {
  exercise: Exercise;
  dueAt: number;
  overdueMs: number;
  kind: MistakeKind;
  reason: string;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function classifyAttempt(attempt: Attempt): MistakeKind {
  if (attempt.revealed) return "answer-revealed";
  if (attempt.success) {
    return attempt.hints > 0 ? "assisted-success" : "independent-success";
  }
  const exercise = EXERCISES.find((item) => item.id === attempt.exerciseId);
  if (!exercise) return "missed-capture";
  try {
    return inspectMove(exercise.fen, attempt.move).moved.captured
      ? "unsafe-capture"
      : "missed-capture";
  } catch {
    return "missed-capture";
  }
}

const SUCCESS_INTERVALS = [DAY, 3 * DAY, 7 * DAY, 14 * DAY];

function scheduleHistory(attempts: Attempt[]) {
  let dueAt = -Infinity;
  let streak = 0;
  let interval = DAY;
  let latest: Attempt | undefined;
  const ordered = [
    ...new Map(attempts.map((attempt) => [attempt.id, attempt])).values(),
  ].sort((a, b) => a.at - b.at || a.ordinal - b.ordinal);
  for (const attempt of ordered) {
    // Immediate retries remain in history but cannot extend recall spacing.
    if (latest && attempt.at < dueAt) continue;
    latest = attempt;
    const kind = classifyAttempt(attempt);
    if (kind === "independent-success") {
      streak++;
      interval =
        SUCCESS_INTERVALS[Math.min(streak - 1, SUCCESS_INTERVALS.length - 1)];
    } else {
      streak = 0;
      interval =
        kind === "answer-revealed"
          ? 30 * MINUTE
          : kind === "assisted-success"
            ? 4 * HOUR
            : 10 * MINUTE;
    }
    dueAt = attempt.at + interval;
  }
  return { dueAt, interval, latest };
}

export function reviewIntervalMs(
  attempt: Attempt,
  attempts: Attempt[],
): number {
  return scheduleHistory([
    ...attempts.filter(
      (item) => item.exerciseId === attempt.exerciseId && item.at <= attempt.at,
    ),
    attempt,
  ]).interval;
}

function reasonFor(kind: MistakeKind): string {
  switch (kind) {
    case "unsafe-capture":
      return "Lần trước quân vừa ăn bị đối thủ ăn lại ngay. Ôn lại để tập nhìn nước đáp trước khi đi.";
    case "missed-capture":
      return "Lần trước bạn chưa tìm đúng nước ăn quân. Nghỉ một chút rồi thử lại.";
    case "answer-revealed":
      return "Bạn đã xem lời giải. Để một lúc rồi tự tìm lại xem còn nhớ cách làm không.";
    case "assisted-success":
      return "Lần trước bạn làm đúng nhờ gợi ý. Lần này thử tự tìm mà không mở gợi ý.";
    case "independent-success":
      return "Bạn đã tự làm đúng. Lần ôn sau sẽ cách xa hơn để xem còn nhớ cách nhìn không.";
  }
}

export function buildRetrievalQueue(
  attempts: Attempt[],
  now: number = Date.now(),
): RetrievalItem[] {
  return EXERCISES.flatMap((exercise) => {
    const history = attempts.filter(
      (attempt) => attempt.exerciseId === exercise.id,
    );
    const { latest, dueAt } = scheduleHistory(history);
    if (!latest) return [];
    const kind = classifyAttempt(latest);
    return [
      {
        exercise,
        dueAt,
        overdueMs: Math.max(0, now - dueAt),
        kind,
        reason: reasonFor(kind),
      },
    ];
  }).sort((a, b) => {
    const aDue = a.dueAt <= now;
    const bDue = b.dueAt <= now;
    if (aDue !== bDue) return aDue ? -1 : 1;
    return a.dueAt - b.dueAt;
  });
}

export function recommendNextPractice(
  attempts: Attempt[],
  exposures: Exposures = {},
  now: number = Date.now(),
): { exercise: Exercise; reason: string; dueAt: number | null } {
  const due = buildRetrievalQueue(attempts, now).find(
    (item) => item.dueAt <= now,
  );
  if (due)
    return { exercise: due.exercise, reason: due.reason, dueAt: due.dueAt };
  const fallback = recommendExercise(attempts, exposures);
  return { ...fallback, dueAt: null };
}
