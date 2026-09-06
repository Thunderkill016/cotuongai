export type CurriculumDomain =
  | "rules"
  | "tactics"
  | "calculation"
  | "opening"
  | "middlegame"
  | "endgame"
  | "decision-discipline";

export type SkillLevel = "foundation" | "developing" | "advanced";

export interface CurriculumSkill {
  id: string;
  domain: CurriculumDomain;
  level: SkillLevel;
  title: string;
  vietnameseTerms: string[];
  prerequisites: string[];
  outcome: string;
}

export const CURRICULUM_SKILLS: CurriculumSkill[] = [
  {
    id: "rules-piece-movement",
    domain: "rules",
    level: "foundation",
    title: "Đi quân đúng luật",
    vietnameseTerms: ["chân Mã", "mắt Tượng", "ngòi Pháo", "qua sông"],
    prerequisites: [],
    outcome: "Đi và ăn quân đúng luật mà không cần gợi ý.",
  },
  {
    id: "rules-check-evasion",
    domain: "rules",
    level: "foundation",
    title: "Chiếu Tướng và giải chiếu",
    vietnameseTerms: ["chiếu Tướng", "giải chiếu", "chiếu bí"],
    prerequisites: ["rules-piece-movement"],
    outcome: "Nhận ra khi bị chiếu và tìm được mọi nhóm cách giải chiếu hợp lệ.",
  },
  {
    id: "tactics-recapture",
    domain: "tactics",
    level: "foundation",
    title: "Ăn quân có bị ăn lại không?",
    vietnameseTerms: ["ăn quân", "ăn lại", "nước đáp"],
    prerequisites: ["rules-piece-movement"],
    outcome: "Trước khi ăn quân, kiểm tra được nước ăn lại trực tiếp của đối thủ.",
  },
  {
    id: "tactics-forcing-scan",
    domain: "tactics",
    level: "foundation",
    title: "Nhìn nước cưỡng bức trước",
    vietnameseTerms: ["nước chiếu", "ăn quân", "dọa sát"],
    prerequisites: ["rules-check-evasion", "tactics-recapture"],
    outcome: "Trước mỗi nước, quét được chiếu, ăn quân và dọa sát của hai bên.",
  },
  {
    id: "calculation-candidates",
    domain: "calculation",
    level: "developing",
    title: "Tính các nước ứng cử",
    vietnameseTerms: ["tính nước", "nước đáp", "biến"],
    prerequisites: ["tactics-forcing-scan"],
    outcome: "Tạo 2–3 nước đáng tính và kiểm tra nước đáp mạnh nhất của đối thủ.",
  },
  {
    id: "opening-principles",
    domain: "opening",
    level: "foundation",
    title: "Nguyên tắc khai cuộc",
    vietnameseTerms: ["xuất quân", "tranh tiên", "ra Xe", "thế trận"],
    prerequisites: ["rules-piece-movement"],
    outcome: "Phát triển quân có mục đích và tránh mất tempi vô ích trong khai cuộc.",
  },
  {
    id: "opening-families",
    domain: "opening",
    level: "developing",
    title: "Nhận dạng các hệ khai cuộc",
    vietnameseTerms: [
      "Pháo Đầu",
      "Bình Phong Mã",
      "Phản Cung Mã",
      "Thuận Pháo",
      "Nghịch Pháo",
      "Phi Tượng Cuộc",
      "Tiên Nhân Chỉ Lộ",
    ],
    prerequisites: ["opening-principles"],
    outcome: "Nhận ra họ khai cuộc và hiểu ý tưởng chính trước khi học thuộc biến.",
  },
  {
    id: "middlegame-opponent-intent",
    domain: "middlegame",
    level: "developing",
    title: "Đối thủ đang muốn gì?",
    vietnameseTerms: ["tiên thủ", "phản tiên", "điểm yếu", "phòng thủ"],
    prerequisites: ["calculation-candidates"],
    outcome: "Nhận ra ý đồ trực tiếp của đối thủ trước khi bắt đầu kế hoạch riêng.",
  },
  {
    id: "middlegame-piece-coordination",
    domain: "middlegame",
    level: "developing",
    title: "Phối hợp quân",
    vietnameseTerms: ["phối hợp quân", "công sát", "đổi quân", "thí quân"],
    prerequisites: ["middlegame-opponent-intent"],
    outcome: "Đánh giá quân nào đang hoạt động, quân nào kém và cải thiện quân yếu nhất.",
  },
  {
    id: "endgame-basic-conversion",
    domain: "endgame",
    level: "foundation",
    title: "Tàn cuộc cơ bản",
    vietnameseTerms: ["tàn cuộc", "Sĩ Tượng toàn", "khuyết Sĩ", "khuyết Tượng"],
    prerequisites: ["rules-check-evasion"],
    outcome: "Biết các mục tiêu thắng/hòa cơ bản và không đánh mất ưu thế dễ dàng.",
  },
  {
    id: "decision-loop",
    domain: "decision-discipline",
    level: "foundation",
    title: "Quy trình trước khi đi",
    vietnameseTerms: ["nước chiếu", "ăn quân", "nước đáp", "tính nước"],
    prerequisites: ["tactics-forcing-scan"],
    outcome: "Trước mỗi nước đều kiểm tra đe dọa, nước cưỡng bức, nước đáp và blunder cuối.",
  },
];

export function getSkill(id: string): CurriculumSkill | undefined {
  return CURRICULUM_SKILLS.find((skill) => skill.id === id);
}

export function unlockedSkills(completed: Set<string>): CurriculumSkill[] {
  return CURRICULUM_SKILLS.filter(
    (skill) =>
      !completed.has(skill.id) &&
      skill.prerequisites.every((prerequisite) => completed.has(prerequisite)),
  );
}
