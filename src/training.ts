import { describeMove, inspectMove, position } from "./chess";
import {
  PLAYABLE_KNOWLEDGE_POSITIONS,
  type FoundationalSkill,
} from "./knowledgeVault";

export type SkillId = FoundationalSkill;

export const SKILLS: Record<SkillId, { label: string; description: string }> = {
  "recapture-check": {
    label: "Có bị ăn lại không?",
    description: "Sau khi ăn quân, nhìn xem đối thủ có thể ăn lại ngay không.",
  },
  "line-piece": {
    label: "Đường Xe",
    description: "Xe đi ngang hoặc dọc; chỉ cần để ý quân chắn đường.",
  },
  "cannon-screen": {
    label: "Ngòi Pháo",
    description:
      "Khi Pháo ăn quân, giữa Pháo và mục tiêu phải có đúng một quân làm ngòi.",
  },
  "horse-leg": {
    label: "Chân Mã",
    description:
      "Nhìn chân Mã trước: chân bị chặn thì Mã không đi được hướng đó.",
  },
};

export interface Exercise {
  id: string;
  sourceId: string;
  sourceLocator: string;
  provenanceNote: string;
  verifiedLegality: boolean;
  engineChecked: boolean;
  title: string;
  concept: string;
  description: string;
  fen: string;
  solution: string;
  hints: string[];
  explanation: string;
  kind: "practice" | "transfer";
  skills: SkillId[];
}

export function candidateLimit(isTraining: boolean): number {
  // A beginner exercise needs one committed idea, while the free board keeps
  // space to compare a few alternatives before asking the engine.
  return isTraining ? 1 : 3;
}

export const EXERCISES: Exercise[] = PLAYABLE_KNOWLEDGE_POSITIONS.map(
  (item) => ({
    id: item.id,
    sourceId: item.sourceId,
    sourceLocator: item.sourceLocator,
    provenanceNote:
      "Bài do Kỳ Lộ biên soạn, kiểm luật tự động; không phải trích đoạn cổ phổ.",
    verifiedLegality: item.verified.legality,
    engineChecked: item.verified.engine,
    title: item.titleVi,
    concept: item.learning.outcome,
    description: item.learning.description,
    fen: item.fen,
    solution: item.learning.solution,
    kind: item.learning.kind,
    skills: item.learning.skills,
    hints: item.learning.hints,
    explanation: item.learning.explanation,
  }),
);

export interface AttemptAssessment {
  success: boolean;
  message: string;
  detail: string;
  prediction: { correct: boolean; detail: string } | null;
}

export function assessAttempt(
  fen: string,
  move: string,
  predictedRecapture?: boolean,
): AttemptAssessment {
  const { moved, recaptures } = inspectMove(fen, move);
  const actualRecapture = recaptures.length > 0;
  const prediction =
    typeof predictedRecapture === "boolean"
      ? {
          correct: predictedRecapture === actualRecapture,
          detail: actualRecapture
            ? predictedRecapture
              ? "Bạn đã nhìn ra Đen có thể ăn lại ngay."
              : "Đen có thể ăn lại ngay; lần sau dừng một nhịp để tìm nước đáp này."
            : predictedRecapture
              ? "Đen không có nước ăn lại ngay trong thế này."
              : "Bạn đã nhìn đúng: Đen không có nước ăn lại ngay.",
        }
      : null;
  if (!moved.captured)
    return {
      success: false,
      message: "Nước này đi được, nhưng chưa ăn quân.",
      detail: `${describeMove(fen, move)} chưa ăn quân. Bài này cần tìm một nước ăn quân, rồi nhìn nước đáp của Đen.`,
      prediction,
    };
  if (recaptures.length) {
    const after = position(fen);
    after.move(move);
    return {
      success: false,
      message: "Đối thủ ăn lại được ngay.",
      detail: `${describeMove(fen, move)} nhìn có lợi, nhưng Đen đáp ${describeMove(
        after.fen(),
        `${recaptures[0].from}${recaptures[0].to}`,
      )}. Ăn được quân chưa chắc đã lời nếu quân vừa đi bị ăn lại ngay.`,
      prediction,
    };
  }
  return {
    success: true,
    message: "Đúng rồi — nước này ăn quân mà không bị ăn lại ngay.",
    detail: `${describeMove(fen, move)} ăn quân mà Đen không ăn lại ngay. Điều đó chưa có nghĩa đây là nước hay nhất của cả ván.`,
    prediction,
  };
}

export interface Attempt {
  id: string;
  exerciseId: string;
  move: string;
  success: boolean;
  hints: number;
  revealed: boolean;
  predictedRecapture?: boolean;
  ordinal: number;
  at: number;
}
export const STORAGE_KEY = "ky-lo.attempts.v1";
export const EXPOSURE_KEY = "ky-lo.exposures.v1";
export type Exposures = Record<
  string,
  { hints: number; revealed: boolean; attempts: number }
>;
export function parseExposures(raw: string | null): Exposures {
  if (!raw) return {};
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    return Object.fromEntries(
      EXERCISES.flatMap((ex) => {
        const value = data[ex.id];
        return value &&
          Number.isInteger(value.hints) &&
          value.hints >= 0 &&
          value.hints <= 3 &&
          typeof value.revealed === "boolean"
          ? [
              [
                ex.id,
                {
                  hints: value.hints,
                  revealed: value.revealed,
                  attempts:
                    Number.isSafeInteger(value.attempts) && value.attempts >= 0
                      ? value.attempts
                      : 0,
                },
              ],
            ]
          : [];
      }),
    );
  } catch {
    return {};
  }
}
const MAX_RECORDS = 500; // Bounded device-local history; not an unlimited learner database.
export function nextAttemptOrdinal(
  exerciseId: string,
  attempts: Attempt[],
  exposures: Exposures,
): number {
  // The counter survives pruning the detailed local history to 500 records.
  return (
    Math.max(
      exposures[exerciseId]?.attempts || 0,
      ...attempts
        .filter((a) => a.exerciseId === exerciseId)
        .map((a) => a.ordinal),
    ) + 1
  );
}

export function parseAttempts(raw: string | null): Attempt[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const ids = new Set<string>();
    return data
      .filter((a): a is Attempt => {
        if (!a || typeof a !== "object") return false;
        const v = a as Attempt;
        const ex = EXERCISES.find((e) => e.id === v.exerciseId);
        if (
          !ex ||
          typeof v.id !== "string" ||
          ids.has(v.id) ||
          typeof v.move !== "string" ||
          typeof v.success !== "boolean" ||
          typeof v.revealed !== "boolean" ||
          (v.predictedRecapture !== undefined &&
            typeof v.predictedRecapture !== "boolean") ||
          !Number.isInteger(v.hints) ||
          v.hints < 0 ||
          v.hints > 3 ||
          !Number.isInteger(v.ordinal) ||
          v.ordinal < 1 ||
          !Number.isFinite(v.at) ||
          v.at < 0
        )
          return false;
        try {
          if (
            !position(ex.fen).move(v.move) ||
            assessAttempt(ex.fen, v.move).success !== v.success
          )
            return false;
        } catch {
          return false;
        }
        ids.add(v.id);
        return true;
      })
      .slice(-MAX_RECORDS);
  } catch {
    return [];
  }
}

export function independentSuccesses(attempts: Attempt[]): number {
  return new Set(
    attempts
      .filter(
        (a) => a.success && a.ordinal === 1 && a.hints === 0 && !a.revealed,
      )
      .map((a) => a.exerciseId),
  ).size;
}

export interface SkillSummary {
  id: SkillId;
  label: string;
  attempts: number;
  successes: number;
  independentSuccesses: number;
  failures: number;
  status: "untested" | "needs-review" | "independent-evidence";
}

export function summarizeSkills(attempts: Attempt[]): SkillSummary[] {
  return (Object.keys(SKILLS) as SkillId[]).map((id) => {
    const exerciseIds = new Set(
      EXERCISES.filter((exercise) => exercise.skills.includes(id)).map(
        (exercise) => exercise.id,
      ),
    );
    const relevant = attempts.filter((attempt) =>
      exerciseIds.has(attempt.exerciseId),
    );
    const independent = relevant.filter(
      (attempt) =>
        attempt.success &&
        attempt.ordinal === 1 &&
        attempt.hints === 0 &&
        !attempt.revealed,
    );
    const successes = relevant.filter((attempt) => attempt.success);
    const failures = relevant.filter((attempt) => !attempt.success);
    return {
      id,
      label: SKILLS[id].label,
      attempts: relevant.length,
      successes: successes.length,
      independentSuccesses: independent.length,
      failures: failures.length,
      status: !relevant.length
        ? "untested"
        : independent.length
          ? "independent-evidence"
          : "needs-review",
    };
  });
}

export interface PracticeRecommendation {
  exercise: Exercise;
  reason: string;
}

export function recommendExercise(
  attempts: Attempt[],
  exposures: Exposures = {},
): PracticeRecommendation {
  const allPracticeSeen = EXERCISES.filter(
    (exercise) => exercise.kind === "practice",
  ).every(
    (exercise) =>
      attempts.some((attempt) => attempt.exerciseId === exercise.id) ||
      !!exposures[exercise.id],
  );

  const ranked = EXERCISES.map((exercise, index) => {
    const history = attempts.filter(
      (attempt) => attempt.exerciseId === exercise.id,
    );
    const latest = history.at(-1);
    const independent = history.some(
      (attempt) =>
        attempt.success &&
        attempt.ordinal === 1 &&
        attempt.hints === 0 &&
        !attempt.revealed,
    );
    const assistedOnly =
      history.some((attempt) => attempt.success) && !independent;
    let score = 0;
    let reason = "Ôn lại để giữ thói quen kiểm tra nước đáp.";

    if (latest && !latest.success) {
      score = 500;
      reason =
        "Lần gần nhất chưa đạt mục tiêu; nên thử lại khi lời giải chưa hiện.";
    } else if (assistedOnly) {
      score = 400;
      reason =
        "Lần trước bạn cần gợi ý. Thử lại xem lần này có tự tìm ra không.";
    } else if (!history.length && !exposures[exercise.id]) {
      if (exercise.kind === "practice") {
        score = 300;
        reason = "Bài này bạn chưa thử. Làm một lần để quen cách nhìn.";
      } else if (allPracticeSeen) {
        score = 350;
        reason =
          "Bạn đã thử các bài cơ bản. Sang một thế mới để xem có tự nhận ra nước đi không.";
      } else {
        score = 100;
        reason =
          "Bài chuyển giao sẽ phù hợp hơn sau khi đã thử các bài nền tảng.";
      }
    } else if (!independent) {
      score = 250;
      reason =
        "Bài này bạn chưa tự làm đúng mà không cần gợi ý hay xem lời giải.";
    } else {
      score = 50;
    }

    return { exercise, score, reason, index };
  }).sort((a, b) => b.score - a.score || a.index - b.index);

  return { exercise: ranked[0].exercise, reason: ranked[0].reason };
}

export interface CoachChoice {
  id: string;
  text: string;
}
export function coachChoices(fen: string, move: string): CoachChoice[] {
  const result = inspectMove(fen, move);
  return [
    {
      id: "reply-check",
      text: "Trước khi xem máy tính, thử tìm nước chiếu hoặc nước ăn quân và nghĩ xem đối thủ sẽ đáp thế nào.",
    },
    {
      id: "capture-check",
      text: result.moved.captured
        ? "Bạn vừa ăn quân. Nhìn xem quân vừa đi có bị đối thủ ăn lại ngay không."
        : "Sau nước vừa đi, quân nào của bạn đang bị đối thủ nhòm tới?",
    },
    {
      id: "compare-lines",
      text: "Tính thêm một nước nữa. Với mỗi nước, thử nghĩ nước đáp mạnh nhất của đối thủ rồi mới so sánh.",
    },
  ];
}
