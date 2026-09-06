# Xiangqi Knowledge Vault

## Mục tiêu

Kho này không nhằm tuyên bố “đã học hết mọi bí kíp cờ tướng”. Mục tiêu là biến nguồn Việt–Trung thành một hệ thống có provenance, có trạng thái kiểm chứng và có thể chuyển thành bài học trong game mà không sao chép mù quáng.

Mỗi nguồn phải trả lời được 5 câu hỏi:

1. Đây là nguồn gốc, tuyển tập hay bản chú giải đời sau?
2. Bản nào / dị bản nào?
3. Nội dung thuộc khai cuộc, trung cuộc, tàn cuộc, sát pháp hay bài cuộc?
4. Có quyền tái sử dụng văn bản hay chỉ được tham khảo ý tưởng?
5. Thế cờ/nước đi đã được kiểm lại bằng luật hiện hành và Pikafish chưa?

## Các tầng nguồn hiện được ưu tiên

### Tầng A — cổ phổ / bản scan công cộng

- `适情雅趣` — Thích Tình Nhã Thú.
- `橘中秘` — Quất Trung Bí, 1632; trọng Pháo Đầu, Thuận/Nghịch Pháo, công sát và tàn cục.
- `梅花谱` cùng các nhánh `吴氏梅花谱`, `无双品梅花谱` — hệ Mai Hoa, đặc biệt tư tưởng Mã đối Pháo Đầu.
- `烂柯神机` — Lạn Kha Thần Cơ.
- `韬略元机` — Thao Lược Nguyên Cơ.
- `心武残编` — Tâm Võ Tàn Biên; hệ thống hòa cục sâu.
- `百局象棋谱` — Bách Cục Tượng Kỳ Phổ; giang hồ bài cuộc, gồm các danh cục như Thất Tinh Tụ Hội, Dã Mã Thao Điền, Khâu Dẫn Hàng Long, Thiên Lý Độc Hành.
- `竹香斋象戏谱` — Trúc Hương Trai Tượng Hí Phổ.
- `渊深海阔` — Uyên Thâm Hải Khoát.
- `象棋谱大全` — Tượng Kỳ Phổ Đại Toàn, dùng như cầu nối số hóa và đối chiếu dị bản.

Wikimedia Commons hiện có scan cơ học public-domain của `橘中秘象棋谱` và nhiều quyển `象棋谱大全`. Quyền sử dụng phải được giữ ở mức từng file/bản cụ thể, không suy rộng sang chú giải hiện đại.

### Tầng B — nguồn cổ được biết qua truyền bản / phục dựng

- `金鹏十八变` — Kim Bằng Thập Bát Biến: bản gốc thất truyền; chỉ học phần được phổ đời sau bảo lưu.
- `梦入神机` — Mộng Nhập Thần Cơ: bản cổ thất truyền; không gắn nhãn “nguyên bản” cho tài liệu phục dựng trên mạng.

Các nguồn này phải có trạng thái `reconstructed`, không được dùng để tạo tuyên bố lịch sử chắc chắn nếu chưa có bằng chứng sơ cấp.

### Tầng C — lý thuyết hiện đại

Ví dụ: hệ Phản Cung Mã của Hồ Vinh Hoa, Dịch Lâm của Dương Quan Lân, tuyển tập khai–trung–tàn hiện đại, sách Việt và Trung hiện còn bản quyền.

Nguyên tắc: dùng để học khái niệm, cấu trúc biến và ván công khai; bài học trong game phải được tự biên soạn. Không sao chép nguyên văn chương sách.

### Tầng D — web / diễn đàn / kỳ phổ số

Các site như thư viện kỳ phổ, diễn đàn, blog cũ và bộ PGN/XQF được dùng để:

- tìm variant và tên thế;
- tìm game record;
- đối chiếu cách gọi thuật ngữ;
- phát hiện sai khác giữa bản in và bản số hóa.

Chúng không tự động trở thành nguồn quyền lực cao hơn bản gốc hoặc luật chính thức.

## Pipeline ingest

```text
Nguồn
  ↓
metadata + edition + rights
  ↓
trích thế cờ / biến / motif (không bê văn bản có bản quyền)
  ↓
chuẩn hóa FEN + notation + tên quân
  ↓
kiểm luật deterministic
  ↓
Pikafish kiểm tra: legal / score / PV / mate / alternative
  ↓
gắn tag chiến thuật / khai cuộc / tàn cuộc
  ↓
AI viết lời giải thích tiếng Việt mới từ dữ kiện đã kiểm chứng
  ↓
review con người / test
  ↓
lesson / puzzle / game review / historical reenactment
```

## Định dạng tri thức đích

Một knowledge item dùng trong game về sau nên có tối thiểu:

```ts
{
  id,
  sourceIds,
  editionNotes,
  fen,
  sideToMove,
  moves,
  titleVi,
  titleZh,
  themes,
  difficulty,
  engineVerification: {
    engine,
    version,
    depth,
    bestMove,
    score,
    alternatives
  },
  rights,
  teachingGoal,
  misconceptionTargets
}
```

## Những thứ tuyệt đối không làm

- Không gọi một PDF vô danh là “bí kíp thất truyền”.
- Không xem lời giải cổ là tối ưu chỉ vì nó cổ.
- Không cho LLM tự bịa biến cờ.
- Không copy nguyên sách hiện đại vào prompt hoặc bundle.
- Không trộn các dị bản Mai Hoa, Trúc Hương Trai, Bách Cục… thành một bản duy nhất.
- Không biến kho kiến thức thành encyclopedia chỉ để đọc; mỗi item cuối cùng phải phục vụ chơi, luyện hoặc review.

## Đích sản phẩm

Knowledge Vault phải giúp game tạo được vòng lặp:

```text
chơi ván thật
→ engine tìm thời điểm đáng học
→ map lỗi sang motif / nguồn tri thức
→ đưa một thế cổ hoặc hiện đại có cùng ý tưởng
→ người chơi tự tính
→ AI coach giải thích bằng tiếng Việt tự nhiên
→ hẹn ôn lại
→ kiểm tra lại trong ván sau
```

Khi làm được vòng này, cổ phổ không còn là “sách nằm trong kho”; nó trở thành bài tập sống gắn với chính lỗi của người chơi.
