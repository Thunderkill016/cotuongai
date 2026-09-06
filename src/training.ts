import { inspectMove, position } from "./chess";

export type SkillId =
  | "recapture-check"
  | "line-piece"
  | "cannon-screen"
  | "horse-leg";

export const SKILLS: Record<SkillId, { label: string; description: string }> = {
  "recapture-check": {
    label: "Kiểm tra bắt lại",
    description: "Sau một nước bắt, tìm nước đối phương có thể bắt lại ngay.",
  },
  "line-piece": {
    label: "Đường Xe",
    description: "Nhìn đường thẳng, vật cản và mục tiêu của Xe.",
  },
  "cannon-screen": {
    label: "Giá Pháo",
    description: "Đếm đúng một quân làm giá khi Pháo bắt quân.",
  },
  "horse-leg": {
    label: "Chân Mã",
    description: "Kiểm tra chân Mã trước khi tính nước đi hình chữ nhật.",
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
    concept: "Quan sát quân có thể bắt",
    description:
      "Đỏ đi. Tìm một nước bắt quân mà đối phương không thể bắt lại ngay quân vừa đi.",
    fen: "4k4/9/9/9/4p4/9/1n7/9/9/1R2K4 r - - 0 1",
    solution: "b0b3",
    kind: "practice",
    skills: ["line-piece", "recapture-check"],
    hints: [
      "Xe đi thẳng theo hàng hoặc cột khi không có quân chắn.",
      "Nhìn cùng cột với Xe đỏ: giữa Xe và Mã đen có quân nào không?",
      "Thử đưa Xe từ b0 đến b3, rồi kiểm tra các nước bắt lại của Đen.",
    ],
    explanation:
      "Xe từ b0 bắt Mã ở b3 qua một đường trống. Trong thế cờ này, Đen không có nước hợp lệ bắt lại Xe ngay lượt kế tiếp.",
  },
  {
    id: "cannon-screen",
    title: "Một giá Pháo",
    concept: "Đếm quân giữa Pháo và mục tiêu",
    description:
      "Đỏ đi. Pháo cần đúng một quân làm giá để bắt quân. Tìm nước bắt an toàn trong một lượt.",
    fen: "4k4/9/7r1/9/4p4/7p1/9/7C1/9/4K4 r - - 0 1",
    solution: "h2h7",
    kind: "practice",
    skills: ["cannon-screen", "recapture-check"],
    hints: [
      "Khi bắt quân, Pháo nhảy qua đúng một quân nằm giữa nó và mục tiêu.",
      "Nhìn cột h. Tốt đen cũng có thể làm giá cho Pháo đỏ.",
      "Thử Pháo h2 → h7. Có đúng một quân ở giữa: Tốt h4.",
    ],
    explanation:
      "Pháo h2 bắt Xe h7 bằng cách nhảy qua Tốt h4. Đúng một quân làm giá; Đen không có nước bắt lại Pháo ngay lượt sau.",
  },
  {
    id: "horse-leg",
    title: "Chân Mã có thoáng?",
    concept: "Kiểm tra đường đi trước khi bắt",
    description:
      "Đỏ đi. Tìm nước Mã bắt quân hợp lệ và kiểm tra khả năng đối phương bắt lại.",
    fen: "4k4/9/9/9/4p4/9/3r5/9/2N6/4K4 r - - 0 1",
    solution: "c1d3",
    kind: "practice",
    skills: ["horse-leg", "recapture-check"],
    hints: [
      "Mã đi hai điểm theo một hướng rồi một điểm vuông góc. Quân ở chân Mã có thể chặn nước đi.",
      "Từ c1 lên d3, chân Mã nằm ở c2. Ô đó có trống không?",
      "Thử Mã c1 → d3 để bắt Xe, rồi kiểm tra nước đáp của Đen.",
    ],
    explanation:
      "Mã c1 bắt Xe d3 vì chân Mã ở c2 trống. Đen không có nước hợp lệ bắt lại Mã ngay lượt sau.",
  },
  {
    id: "transfer-rook",
    title: "Tự tìm ở thế mới",
    concept: "Áp dụng mà chưa xem gợi ý",
    description:
      "Đỏ đi. Dùng cách quan sát vừa luyện để tìm một nước bắt quân không bị bắt lại ngay.",
    fen: "4k4/9/9/9/4p4/9/9/2c4R1/9/4K4 r - - 0 1",
    solution: "h2c2",
    kind: "transfer",
    skills: ["line-piece", "recapture-check"],
    hints: [
      "Tìm quân đối phương nằm cùng hàng hoặc cột với Xe.",
      "Quan sát hàng 2 và khoảng trống giữa Xe đỏ với Pháo đen.",
      "Thử Xe h2 → c2, rồi kiểm tra các quân Đen còn lại.",
    ],
    explanation:
      "Xe h2 bắt Pháo c2 theo hàng ngang không bị chắn. Đen không có nước bắt lại Xe ngay lượt sau trong thế này.",
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
      message: "Nước hợp lệ. Hãy tìm một nước bắt quân.",
      detail:
        "Mục tiêu bài này là quan sát quân có thể bắt, rồi kiểm tra nước bắt lại của đối phương.",
    };
  if (recaptures.length)
    return {
      success: false,
      message: "Đối phương có thể bắt lại quân vừa đi.",
      detail: `Hãy kiểm tra nước đáp ${recaptures[0].from} → ${recaptures[0].to}. Một nước bắt quân chưa chắc đã an toàn.`,
    };
  return {
    success: true,
    message: "Bạn đã tìm được nước bắt phù hợp.",
    detail:
      "Nước bắt hợp lệ và đối phương không có nước bắt lại ngay quân vừa đi. Đây là kết quả của bài quan sát một lượt, chưa phải kết luận tối ưu toàn ván.",
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
        "Bạn đã làm được nhưng có trợ giúp; thử lại để tạo bằng chứng độc lập.";
    } else if (!history.length && !exposures[exercise.id]) {
      if (exercise.kind === "practice") {
        score = 300;
        reason = "Bài nền tảng này chưa có lần thử nào.";
      } else if (allPracticeSeen) {
        score = 350;
        reason =
          "Các bài nền tảng đã được xem; chuyển sang thế mới để kiểm tra khả năng áp dụng.";
      } else {
        score = 100;
        reason =
          "Bài chuyển giao sẽ phù hợp hơn sau khi đã thử các bài nền tảng.";
      }
    } else if (!independent) {
      score = 250;
      reason =
        "Bài này chưa có lần đúng đầu tiên mà không dùng gợi ý hay lời giải.";
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
      text: "Trước khi xem biến thể, hãy tìm nước chiếu hoặc nước bắt quân mà đối phương có thể đáp lại.",
    },
    {
      id: "capture-check",
      text: result.moved.captured
        ? "Bạn vừa bắt quân. Hãy kiểm tra xem quân vừa đi có bị bắt lại ngay không."
        : "Sau nước vừa đi, quân nào của bạn đang có thể bị đối phương tấn công?",
    },
    {
      id: "compare-lines",
      text: "Chọn thêm một nước ứng viên. Với mỗi nước, thử hình dung một nước đáp mạnh của đối phương rồi mới so sánh.",
    },
  ];
}
