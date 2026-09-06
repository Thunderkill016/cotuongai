import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FlipVertical2,
  RefreshCw,
  Swords,
  Target,
} from "lucide-react";
import { Board } from "./Board";
import { deriveBattleCue } from "./battleCue";
import { position, replay } from "./chess";
import {
  buildTodayPracticeQueue,
  duePracticeCount,
  GAME_PRACTICE_STORAGE_KEY,
  parsePracticeCards,
  practiceTagLabel,
  recordPracticeAttempt,
  reviewKindLabel,
  type GamePracticeCard,
} from "./practiceMemory";
import "./today.css";

interface TodayPracticeProps {
  onExit: () => void;
  onPlay: () => void;
}

function loadCards(): GamePracticeCard[] {
  try {
    return parsePracticeCards(localStorage.getItem(GAME_PRACTICE_STORAGE_KEY));
  } catch {
    return [];
  }
}

function moveLabel(move: string | null) {
  return move ? `${move.slice(0, 2)} → ${move.slice(2)}` : "—";
}

function dueLabel(dueAt: number, now: number) {
  if (dueAt <= now) return "Đến hạn ôn";
  const delta = dueAt - now;
  const hours = Math.max(1, Math.round(delta / 3_600_000));
  if (hours < 24) return `Còn khoảng ${hours} giờ`;
  return `Còn khoảng ${Math.max(1, Math.round(hours / 24))} ngày`;
}

export function TodayPractice({ onExit, onPlay }: TodayPracticeProps) {
  const [cards, setCards] = useState(loadCards);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [guess, setGuess] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [message, setMessage] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const now = Date.now();

  const queue = useMemo(
    () => buildTodayPracticeQueue(cards, now, 8),
    [cards, now],
  );
  const active = activeId
    ? (cards.find((card) => card.id === activeId) ?? null)
    : (queue[0] ?? null);
  const dueCount = duePracticeCount(cards, now);
  const game = useMemo(() => {
    if (!active) return null;
    try {
      return position(active.rootFen);
    } catch {
      return null;
    }
  }, [active]);
  const destinations =
    game && selected && !revealed
      ? game.moves({ square: selected }).map((move) => move.slice(2))
      : [];
  const displayFen =
    active && revealed
      ? replay(active.rootFen, [active.bestmove])
      : active?.rootFen;
  const moveEffect =
    active && revealed
      ? deriveBattleCue(active.rootFen, active.bestmove)
      : null;

  useEffect(() => {
    if (!activeId && queue[0]) {
      setActiveId(queue[0].id);
      setFlipped(queue[0].side === "b");
    }
  }, [activeId, queue]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== GAME_PRACTICE_STORAGE_KEY) return;
      setCards(parsePracticeCards(event.newValue));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  function save(next: GamePracticeCard[]) {
    setCards(next);
    try {
      localStorage.setItem(GAME_PRACTICE_STORAGE_KEY, JSON.stringify(next));
      setStorageWarning("");
    } catch {
      setStorageWarning(
        "Trình duyệt không lưu được kết quả ôn. Dữ liệu mới chỉ giữ trong phiên này.",
      );
    }
  }

  function clickSquare(square: string) {
    if (!active || !game || revealed) return;
    setMessage("");
    const piece = game.get(square);
    if (piece?.color === active.side) {
      setSelected((current) => (current === square ? null : square));
      setGuess(null);
      return;
    }
    if (!selected) {
      setMessage("Chọn một quân của bạn trước.");
      return;
    }
    const move = `${selected}${square}`;
    if (!game.moves().includes(move)) {
      setMessage("Nước này không hợp lệ trong thế đã lưu.");
      return;
    }
    setGuess(move);
    setSelected(null);
  }

  function commit() {
    if (!active || !guess) return;
    try {
      const updated = recordPracticeAttempt(active, guess, Date.now());
      save(cards.map((card) => (card.id === active.id ? updated : card)));
      setRevealed(true);
      setMessage("");
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  function nextCard() {
    if (!active) return;
    const candidates = buildTodayPracticeQueue(cards, Date.now(), 8).filter(
      (card) => card.id !== active.id,
    );
    const next = candidates[0] ?? null;
    setActiveId(next?.id ?? null);
    setSelected(null);
    setGuess(null);
    setRevealed(false);
    setMessage("");
    if (next) setFlipped(next.side === "b");
  }

  return (
    <div className="app-shell today-shell">
      <header className="topbar">
        <button className="play-back" type="button" onClick={onExit}>
          <ArrowLeft size={17} />
          Về khu luyện
        </button>
        <div className="brand" aria-label="Kỳ Lộ">
          <span className="brand-seal">將</span>
          <span>
            Kỳ Lộ<span className="brand-sub">HÔM NAY LUYỆN GÌ</span>
          </span>
        </div>
        <button className="today-play-link" type="button" onClick={onPlay}>
          <Swords size={16} /> Chơi ván thật
        </button>
      </header>

      <main className="today-main">
        <section className="page-heading today-heading">
          <div>
            <div className="eyebrow">ÔN TỪ CHÍNH VÁN CỦA BẠN</div>
            <h1>Không học lỗi chung chung. Ôn lại đúng thế đã gặp.</h1>
            <p>
              Các thế ở đây chỉ xuất hiện sau khi ván thật đã được Pikafish phân
              tích và bạn đã tự tính lại trước khi xem đáp án.
            </p>
          </div>
          <div className="today-stats" aria-label="Tình trạng ôn tập">
            <div>
              <strong>{dueCount}</strong>
              <span>đến hạn</span>
            </div>
            <div>
              <strong>{cards.length}</strong>
              <span>thế đã lưu</span>
            </div>
          </div>
        </section>

        {!active || !displayFen || !game ? (
          <section className="today-empty">
            <Target size={34} />
            <h2>Chưa có thế từ ván thật để ôn.</h2>
            <p>
              Chơi một ván với Pikafish, bấm <b>Phân tích ván</b>, tự tính lại
              các thời điểm được chọn rồi chốt nước. Kỳ Lộ mới tạo lịch ôn từ
              evidence đó.
            </p>
            <button className="primary-button" onClick={onPlay}>
              <Swords size={17} /> Chơi ván và tạo dữ liệu thật
            </button>
          </section>
        ) : (
          <div className="workspace today-workspace">
            <section
              className="board-section"
              aria-label="Thế cờ cần ôn hôm nay"
            >
              <div className="board-topline">
                <span className="side-label">
                  <CalendarClock size={15} /> {dueLabel(active.dueAt, now)}
                </span>
                <button
                  className="icon-button"
                  title="Xoay bàn cờ"
                  aria-label="Xoay bàn cờ"
                  onClick={() => setFlipped((value) => !value)}
                >
                  <FlipVertical2 size={18} />
                </button>
              </div>

              <Board
                fen={displayFen}
                selected={revealed ? null : selected}
                destinations={destinations}
                arrow={null}
                lastMove={revealed ? active.bestmove : null}
                moveEffect={moveEffect}
                onSquare={clickSquare}
                disabled={revealed}
                flipped={flipped}
              />

              <div className="board-bottomline today-board-prompt">
                <span>
                  <span className="legend-dot" />
                  {revealed
                    ? "Đáp án engine đã mở"
                    : guess
                      ? `Nước đang chốt: ${moveLabel(guess)}`
                      : "Tự tính rồi chọn một nước trên bàn"}
                </span>
              </div>
              {message && (
                <p className="inline-message" role="alert">
                  {message}
                </p>
              )}
            </section>

            <aside className="coach-panel today-panel">
              <section className="today-card-meta">
                <div className="section-label">
                  <span>VÌ SAO THẾ NÀY ĐƯỢC LƯU</span>
                  <small>nước {active.sourcePly + 1}</small>
                </div>
                <h2>{reviewKindLabel(active.reviewKind)}</h2>
                <div className="today-tags">
                  {active.tags.map((tag) => (
                    <span key={tag}>{practiceTagLabel(tag)}</span>
                  ))}
                </div>
                {active.lossCp !== null && (
                  <p className="muted">
                    Chênh đánh giá engine lúc review:{" "}
                    {(active.lossCp / 100).toFixed(2)}. Đây là evidence của
                    Pikafish ở ngân sách tìm kiếm đã lưu, không phải điểm Elo
                    hay kết luận trình độ.
                  </p>
                )}
              </section>

              {!revealed ? (
                <section className="today-task">
                  <h3>Nhìn thế cờ, tự tính trước.</h3>
                  <p>
                    Tìm nước chiếu, nước ăn quân và nước đối thủ có thể đáp.
                    Đừng cố nhớ tọa độ từ lần review trước.
                  </p>
                  <button
                    className="primary-button"
                    disabled={!guess}
                    onClick={commit}
                  >
                    <CheckCircle2 size={16} /> Chốt nước tôi chọn
                  </button>
                </section>
              ) : (
                <section className="today-result" aria-live="polite">
                  <div
                    className={
                      guess === active.bestmove ? "is-correct" : "is-missed"
                    }
                  >
                    {guess === active.bestmove
                      ? "Lần này bạn tìm đúng nước Pikafish đã lưu."
                      : "Lần này nước bạn chọn vẫn khác nước Pikafish đã lưu."}
                  </div>
                  <dl className="review-comparison">
                    <div>
                      <dt>Trong ván</dt>
                      <dd>{moveLabel(active.playedMove)}</dd>
                    </div>
                    <div>
                      <dt>Lần ôn này</dt>
                      <dd>{moveLabel(guess)}</dd>
                    </div>
                    <div>
                      <dt>Pikafish</dt>
                      <dd>{moveLabel(active.bestmove)}</dd>
                    </div>
                  </dl>
                  <p className="review-pv">
                    Biến đã lưu:{" "}
                    {active.bestLine.slice(0, 5).map(moveLabel).join(" · ")}
                  </p>
                  <p className="today-provenance">
                    {active.engineBuild} · {active.engineBudgetMs} ms
                  </p>
                  <button className="primary-button" onClick={nextCard}>
                    Thế tiếp theo <ChevronRight size={16} />
                  </button>
                </section>
              )}

              <section className="today-history-note">
                <RefreshCw size={15} />
                <p>
                  Lịch hiện dùng heuristic: sai thì quay lại sớm; tự tìm đúng
                  liên tiếp thì giãn ra 1 → 3 → 7 → 14 ngày. Đây chưa phải lịch
                  đã được hiệu chuẩn khoa học riêng cho cờ tướng.
                </p>
              </section>
              {storageWarning && (
                <p className="analysis-note">{storageWarning}</p>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
