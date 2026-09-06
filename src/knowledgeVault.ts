export type KnowledgeLanguage = "zh" | "vi" | "mixed";
export type KnowledgeRights =
  | "public-domain"
  | "public-domain-scan"
  | "reference-only"
  | "lost-source";
export type KnowledgeKind =
  | "ancient-manual"
  | "opening"
  | "middlegame"
  | "endgame"
  | "composition"
  | "rules"
  | "modern-theory"
  | "game-collection";

export interface KnowledgeSource {
  id: string;
  title: string;
  chineseTitle?: string;
  language: KnowledgeLanguage;
  era: string;
  kind: KnowledgeKind[];
  themes: string[];
  rights: KnowledgeRights;
  status: "primary" | "derivative" | "reconstructed" | "index";
  url?: string;
  note: string;
}

/**
 * Source registry, not a text dump. Copyrighted modern books are reference-only.
 * Historical scans marked public-domain are still checked individually before reuse.
 */
export const KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  {
    id: "jinpeng-shibabian",
    title: "Kim Bằng Thập Bát Biến",
    chineseTitle: "金鹏十八变",
    language: "zh",
    era: "Tống / bản gốc thất truyền",
    kind: ["ancient-manual", "opening"],
    themes: ["toàn cục", "đấu Pháo", "nguồn cổ của nhiều biến sau này"],
    rights: "lost-source",
    status: "reconstructed",
    note: "Bản gốc được coi là thất truyền; chỉ học qua phần được các phổ đời sau bảo lưu hoặc dẫn lại.",
  },
  {
    id: "mengru-shenji",
    title: "Mộng Nhập Thần Cơ",
    chineseTitle: "梦入神机",
    language: "zh",
    era: "Minh / nguồn cổ thất truyền",
    kind: ["ancient-manual", "endgame", "composition"],
    themes: ["tàn cuộc", "sát cục", "nguồn của các tuyển tập đời sau"],
    rights: "lost-source",
    status: "reconstructed",
    note: "Không coi các bản phục dựng trên mạng là nguyên bản nếu thiếu provenance.",
  },
  {
    id: "shiqing-yaqu",
    title: "Thích Tình Nhã Thú",
    chineseTitle: "适情雅趣",
    language: "zh",
    era: "Minh",
    kind: ["ancient-manual", "opening", "endgame", "composition"],
    themes: ["toàn cục", "thuận Pháo", "thí Mã", "sát pháp", "cổ phổ"],
    rights: "public-domain",
    status: "primary",
    note: "Một nguồn trọng yếu bảo lưu vật liệu từ các phổ cổ hơn; cần đối chiếu dị bản trước khi chuẩn hóa thế cờ.",
  },
  {
    id: "ju-zhong-mi",
    title: "Quất Trung Bí",
    chineseTitle: "橘中秘",
    language: "zh",
    era: "Minh, 1632",
    kind: ["ancient-manual", "opening", "endgame"],
    themes: [
      "Pháo Đầu",
      "Thuận Pháo",
      "Nghịch Pháo",
      "công sát",
      "thí quân",
      "thực dụng tàn cục",
    ],
    rights: "public-domain-scan",
    status: "primary",
    url: "https://commons.wikimedia.org/wiki/File:SSID-13711492_%E6%A9%98%E4%B8%AD%E7%A7%98%E8%B1%A1%E6%A3%8B%E8%AD%9C.pdf",
    note: "Có bản scan cơ học public-domain trên Wikimedia Commons; vẫn cần giữ metadata và không trộn chú giải hiện đại có bản quyền.",
  },
  {
    id: "mei-hua-pu",
    title: "Mai Hoa Phổ",
    chineseTitle: "梅花谱",
    language: "zh",
    era: "Thanh sơ",
    kind: ["ancient-manual", "opening"],
    themes: ["Bình Phong Mã", "chống Pháo Đầu", "phản công", "trận hình"],
    rights: "public-domain",
    status: "primary",
    note: "Tên gọi bao trùm nhiều hệ bản và dị bản; phải ghi rõ bản nào khi trích thế cờ hoặc biến khai cuộc.",
  },
  {
    id: "wu-shi-meihua",
    title: "Ngô Thị Mai Hoa Phổ",
    chineseTitle: "吴氏梅花谱",
    language: "zh",
    era: "Thanh",
    kind: ["ancient-manual", "opening"],
    themes: ["Mai Hoa hệ", "Pháo Đầu đối Mã", "biến trận"],
    rights: "public-domain",
    status: "primary",
    note: "Được tách riêng để tránh gộp sai các dị bản Mai Hoa thành một nguồn duy nhất.",
  },
  {
    id: "wushuangpin-meihua",
    title: "Vô Song Phẩm Mai Hoa Phổ",
    chineseTitle: "无双品梅花谱",
    language: "zh",
    era: "Thanh",
    kind: ["ancient-manual", "opening"],
    themes: ["Mai Hoa hệ", "khai cuộc", "công thủ chuyển hóa"],
    rights: "public-domain",
    status: "primary",
    note: "Theo dõi như một nhánh văn bản riêng trong cây dị bản.",
  },
  {
    id: "lanke-shenji",
    title: "Lạn Kha Thần Cơ",
    chineseTitle: "烂柯神机",
    language: "zh",
    era: "cổ phổ",
    kind: ["ancient-manual", "endgame", "composition"],
    themes: ["bài cuộc", "sát cục", "tàn cuộc"],
    rights: "public-domain-scan",
    status: "primary",
    url: "https://commons.wikimedia.org/wiki/File:NLC416-14jh005212-68984_%E8%B1%A1%E6%A3%8B%E8%AD%9C%E5%A4%A7%E5%85%A8.pdf",
    note: "Có trong các tập Tượng Kỳ Phổ Đại Toàn số hóa; cần xác định đúng quyển/trang khi ingest.",
  },
  {
    id: "taolue-yuanji",
    title: "Thao Lược Nguyên Cơ",
    chineseTitle: "韬略元机",
    language: "zh",
    era: "Thanh",
    kind: ["ancient-manual", "endgame", "composition"],
    themes: ["bài cuộc", "mưu lược", "sát pháp"],
    rights: "public-domain",
    status: "primary",
    note: "Dùng để khai thác motif, không mặc định mọi lời giải cổ là tối ưu theo engine hiện đại.",
  },
  {
    id: "xinwu-canbian",
    title: "Tâm Võ Tàn Biên",
    chineseTitle: "心武残编",
    language: "zh",
    era: "Thanh, khoảng 1800",
    kind: ["ancient-manual", "endgame", "composition"],
    themes: ["hòa cục", "bài cuộc", "quy tắc cổ", "tàn cuộc sâu"],
    rights: "public-domain",
    status: "primary",
    note: "Nổi bật ở hệ thống hòa cục; hữu ích để dạy người học không đánh đồng ưu thế vật chất với thắng cờ.",
  },
  {
    id: "baiju-xiangqi",
    title: "Bách Cục Tượng Kỳ Phổ",
    chineseTitle: "百局象棋谱",
    language: "zh",
    era: "Thanh, 1801",
    kind: ["ancient-manual", "endgame", "composition"],
    themes: [
      "giang hồ bài cuộc",
      "Thất Tinh Tụ Hội",
      "Dã Mã Thao Điền",
      "Khâu Dẫn Hàng Long",
      "Thiên Lý Độc Hành",
    ],
    rights: "public-domain",
    status: "primary",
    note: "Một nguồn quan trọng của hệ giang hồ tàn cục; các bản hiện đại có thể sửa lời giải nên phải lưu variant ID.",
  },
  {
    id: "zhuxiangzhai",
    title: "Trúc Hương Trai Tượng Hí Phổ",
    chineseTitle: "竹香斋象戏谱",
    language: "zh",
    era: "Thanh, 1804+",
    kind: ["ancient-manual", "endgame", "composition"],
    themes: ["bài cuộc", "dị bản giang hồ", "sát cục", "hòa cục"],
    rights: "public-domain-scan",
    status: "primary",
    url: "https://commons.wikimedia.org/wiki/File:NLC416-06jh007016-16323_%E8%B1%A1%E6%A3%8B%E8%AD%9C%E5%A4%A7%E5%85%A8.pdf",
    note: "Các tập Tượng Kỳ Phổ Đại Toàn có chứa phần Trúc Hương Trai; cần map mục lục sang record cụ thể.",
  },
  {
    id: "yuanshen-haikuo",
    title: "Uyên Thâm Hải Khoát",
    chineseTitle: "渊深海阔",
    language: "zh",
    era: "cổ phổ",
    kind: ["ancient-manual", "endgame", "composition"],
    themes: ["bài cuộc", "giang hồ cục", "sát pháp phức tạp"],
    rights: "public-domain",
    status: "primary",
    note: "Được dùng như nguồn so sánh tên và lời giải của các bài cuộc nổi tiếng.",
  },
  {
    id: "xiangqipu-daquan",
    title: "Tượng Kỳ Phổ Đại Toàn",
    chineseTitle: "象棋谱大全",
    language: "zh",
    era: "Dân quốc / tuyển tập cổ phổ",
    kind: [
      "game-collection",
      "ancient-manual",
      "opening",
      "endgame",
      "composition",
    ],
    themes: ["tổng tập", "dị bản", "mục lục cổ phổ"],
    rights: "public-domain-scan",
    status: "derivative",
    url: "https://commons.wikimedia.org/wiki/File:NLC416-14jh005212-68984_%E8%B1%A1%E6%A3%8B%E8%AD%9C%E5%A4%A7%E5%85%A8.pdf",
    note: "Dùng như cầu nối số hóa tới nhiều cổ phổ. Không coi tuyển tập là nguồn sớm hơn bản gốc mà nó sao lại.",
  },
  {
    id: "modern-opening-hu-ronghua",
    title: "Chuyên tập Phản Cung Mã (hệ Hồ Vinh Hoa)",
    chineseTitle: "反宫马专集",
    language: "zh",
    era: "hiện đại",
    kind: ["opening", "modern-theory"],
    themes: ["Phản Cung Mã", "khai cuộc hiện đại", "thực chiến danh thủ"],
    rights: "reference-only",
    status: "primary",
    note: "Chỉ dùng metadata/ý tưởng được phép và các ván công khai; không sao chép nguyên văn sách hiện đại.",
  },
  {
    id: "modern-yilin-yang-guanlin",
    title: "Dịch Lâm Tân Biên / hệ Dương Quan Lân",
    chineseTitle: "弈林新编",
    language: "zh",
    era: "hiện đại",
    kind: ["opening", "middlegame", "endgame", "modern-theory"],
    themes: ["tư duy thực chiến", "trung cuộc", "tàn cuộc", "bình chú ván"],
    rights: "reference-only",
    status: "primary",
    note: "Nguồn hiện đại quan trọng nhưng thuộc nhóm tham khảo; các bài học trong game phải tự biên soạn.",
  },
  {
    id: "vietnamese-xiangqi-language",
    title: "Nguồn thuật ngữ và bình cờ Việt Nam",
    language: "vi",
    era: "hiện đại",
    kind: ["rules", "opening", "middlegame", "endgame"],
    themes: [
      "ăn quân",
      "chân Mã",
      "ngòi Pháo",
      "ra Xe",
      "tranh tiên",
      "công sát",
      "Sĩ Tượng",
    ],
    rights: "reference-only",
    status: "index",
    note: "Tổng hợp cách dùng từ từ luật Việt Nam, kỳ đàn/diễn đàn và sách Việt; không xem một blog đơn lẻ là chuẩn thuật ngữ.",
  },
];

export function findKnowledgeSources(term: string): KnowledgeSource[] {
  const q = term.trim().toLocaleLowerCase("vi");
  if (!q) return [...KNOWLEDGE_SOURCES];
  return KNOWLEDGE_SOURCES.filter((source) =>
    [source.title, source.chineseTitle || "", source.era, ...source.themes]
      .join(" ")
      .toLocaleLowerCase("vi")
      .includes(q),
  );
}

export function knowledgeCoverage() {
  const byKind = new Map<KnowledgeKind, number>();
  const byRights = new Map<KnowledgeRights, number>();
  for (const source of KNOWLEDGE_SOURCES) {
    for (const kind of source.kind)
      byKind.set(kind, (byKind.get(kind) || 0) + 1);
    byRights.set(source.rights, (byRights.get(source.rights) || 0) + 1);
  }
  return { byKind, byRights, total: KNOWLEDGE_SOURCES.length };
}
