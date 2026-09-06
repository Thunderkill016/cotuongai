# Cờ Tướng AI

Web huấn luyện cờ tướng (Xiangqi) tập trung vào học và luyện tập có hệ thống thay vì chỉ chơi với máy.

## Product goal

- Bàn cờ 2D/3D rõ ràng, dễ đọc.
- Luật cờ deterministic.
- Pikafish là nguồn sự thật cho phân tích cờ.
- AI coach dùng kết quả engine để giải thích, gợi ý và tạo bài luyện.
- Theo dõi lỗi và tiến bộ của người học.

## Development doctrine

Build theo vertical slice: position -> player move -> legality -> analysis -> coaching -> retry/review.

Visuals, lighting, animation và audio chỉ được giữ lại khi chúng giúp đọc bàn cờ, hiểu trạng thái, phản hồi hoặc học tốt hơn.

## Upstream research

Nền tảng engine/UI được nghiên cứu từ:
- https://github.com/billzi2016/Chinese-Chess-AI-Pro
- https://github.com/official-pikafish/Pikafish

Không sao chép binary/NNUE vào repo này nếu chưa kiểm tra license và provenance.
