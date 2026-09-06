import { inspectMove, position } from "./chess";

export type SkillId =
  | "recapture-check"
  | "line-piece"
  | "cannon-screen"
  | "horse-leg";

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

// Original miniature positions. They test a bounded immediate-capture skill,
// not optimal play, game strength, or a full tactical combination.
export const EXERCISES: Exercise[] = [
  {
    id: "rook-open-file",
    title: "Đường đi của Xe",
    concept: "Tìm quân có thể ăn",
    description:
      "Đỏ đi. Hãy ăn một quân Đen mà quân vừa đi không bị ăn lại ngay.",
    fen: "4k4/9/9/9/4p4/9/1n7/9/9/1R2K4 r - - 0 1",
    solution: "b0b3",
    kind: "practice",
    skills: ["line-piece", "recapture-check"],
    hints: [
      "Xe đi ngang hoặc dọc, miễn là không có quân chắn đường.",
      "Nhìn cùng cột với Xe đỏ. Giữa Xe và Mã đen có quân nào chắn không?",
      "Thử Xe b0 ăn Mã b3. Sau đó nhìn xem Đen có quân nào ăn lại Xe được không.",
    ],
    explanation:
      "Xe b0 ăn Mã b3 vì đường đi không bị chắn. Trong thế này, Đen không ăn lại Xe ngay được.",
  },
  {
    id: "cannon-screen",
    title: "Tìm ngòi cho Pháo",
    concept: "Nhìn ngòi Pháo",
    description:
      "Đỏ đi. Pháo muốn ăn quân phải nhảy qua đúng một quân làm ngòi. Tìm nước ăn mà Pháo không bị ăn lại ngay.",
    fen: "4k4/9/7r1/9/4p4/7p1/9/7C1/9/4K4 r - - 0 1",
    solution: "h2h7",
    kind: "practice",
    skills: ["cannon-screen", "recapture-check"],
    hints: [
      "Khi ăn quân, Pháo phải nhảy qua đúng một quân làm ngòi.",
      "Nhìn cột h. Tốt đen ở giữa có thể làm ngòi cho Pháo đỏ.",
      "Thử Pháo h2 → h7. Có đúng một quân ở giữa: Tốt h4.",
    ],
    explanation:
      "Pháo h2 ăn Xe h7 nhờ Tốt h4 làm ngòi. Sau nước này, Đen không ăn lại Pháo ngay được.",
  },
  {
    id: "horse-leg",
    title: "Chân Mã có thoáng?",
    concept: "Nhìn chân Mã trước khi ăn",
    description:
      "Đỏ đi. Tìm nước Mã ăn quân, rồi xem Đen có ăn lại Mã ngay được không.",
    fen: "4k4/9/9/9/4p4/9/3r5/9/2N6/4K4 r - - 0 1",
    solution: "c1d3",
    kind: "practice",
    skills: ["horse-leg", "recapture-check"],
    hints: [
      "Mã đi theo hình chữ nhật. Nếu chân Mã bị chặn thì Mã không đi được hướng đó.",
      "Từ c1 lên d3, chân Mã nằm ở c2. Ô đó có trống không?",
      "Thử Mã c1 → d3 ăn Xe, rồi nhìn nước đáp của Đen.",
    ],
    explanation:
      "Mã c1 ăn Xe d3 vì chân Mã ở c2 đang thoáng. Đen không ăn lại Mã ngay được.",
  },
  {
    id: "transfer-rook",
    title: "Tự tìm ở thế mới",
    concept: "Tự tìm ở một thế khác",
    description:
      "Đỏ đi. Tự tìm một nước ăn quân mà quân vừa đi không bị ăn lại ngay.",
    fen: "4k4/9/9/9/4p4/9/9/2c4R1/9/4K4 r - - 0 1",
    solution: "h2c2",
    kind: "transfer",
    skills: ["line-piece", "recapture-check"],
    hints: [
      "Tìm quân đối phương nằm cùng hàng hoặc cột với Xe.",
      "Quan sát hàng 2 và khoảng trống giữa Xe đỏ với Pháo đen.",
      "Thử Xe h2 → c2 ăn Pháo, rồi nhìn xem Đen có ăn lại Xe được không.",
    ],
    explanation:
      "Xe h2 ăn Pháo c2 vì hàng ngang không bị chắn. Trong thế này, Đen không ăn lại Xe ngay được.",
  },
];

export function assessAttempt(
  fen: string,
  move: string,
): { success: boolean; message: string; detail: string } {
  const { moved, recaptures } = inspectMove(fen, move);
  if (!moved.captured)
    return {
      success: false,
      message: "Nước này đi được, nhưng chưa ăn quân.",
      detail:
        "Bài này chỉ cần: ăn một quân, rồi nhìn xem đối thủ có ăn lại quân vừa đi được không.",
    };
  if (recaptures.length)
    return {
      success: false,
      message: "Đối thủ ăn lại được ngay.",
      detail: `Nhìn nước đáp ${recaptures[0].from} → ${recaptures[0].to}. Ăn được quân chưa chắc đã lời nếu quân vừa đi bị ăn lại ngay.`,
    };
  return {
    success: true,
    message: "Đúng rồi — nước này ăn quân mà không bị ăn lại ngay.",
    detail:
      "Trong thế này, quân vừa đi không bị ăn lại ngay. Điều đó chưa có nghĩa đây là nước hay nhất của cả ván.",
  };
}

export interface Attempt {
  id: string;
  exerciseId: string;
  move: string;
  success: boolean;
  hints: number;
  revealed: boolean;
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
