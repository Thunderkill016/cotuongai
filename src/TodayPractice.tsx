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
import { describeMove, describeLine, position, replay } from "./chess";
import {
  buildTodayPracticeQueue,
  duePracticeCount,
  GAME_PRACTICE_STORAGE_KEY,
  parsePracticeCards,
  practiceDueLabel,
  practiceTagLabel,
  recordPracticeAttempt,
  reviewKindLabel,
  type GamePracticeCard,
} from "./practiceMemory";
import {
  patternEvidenceLabel,
  profileSampleNote,
  summarizePracticePatterns,
} from "./practicePatterns";
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

export function TodayPractice({ onExit, onPlay }: TodayPracticeProps) {
  const [cards, setCards] = useState(loadCards);
  const [sessionIds] = useState(() =>
    buildTodayPracticeQueue(cards, Date.now()).map((card) => card.id),
  );
  const [sessionIndex, setSessionIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [guess, setGuess] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [message, setMessage] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const now = Date.now();

  const active =
    cards.find((card) => card.id === sessionIds[sessionIndex]) ?? null;
  const finished = sessionIds.length > 0 && sessionIndex >= sessionIds.length;
  const moveLabel = (move: string | null) =>
    active && move ? describeMove(active.rootFen, move) : "—";
  const dueCount = duePracticeCount(cards, now);
  const evidenceProfile = summarizePracticePatterns(cards, now);
  const visiblePatterns = evidenceProfile.patterns
    .filter(
      (pattern) => pattern.negativePositions > 0 || pattern.failedAttempts > 0,
    )
    .slice(0, 3);
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
    if (active) setFlipped(active.side === "b");
  }, [active?.id]);

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
    if (!active || !guess || revealed) return;
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
    setSessionIndex((index) => index + 1);
    setSelected(null);
    setGuess(null);
    setRevealed(false);
    setMessage("");
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
            <h1>Ôn lại những thế đã gặp.</h1>
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
            <h2>
              {finished
                ? "Đã xong buổi ôn."
                : cards.length
                  ? "Chưa có thế đến hạn ôn."
                  : "Chưa có thế từ ván thật để ôn."}
            </h2>
            <p>
              {finished
                ? `Bạn đã ôn ${sessionIds.length} thế. Các lần thử đã được lưu để hẹn ôn lại.`
                : "Chơi một ván với Pikafish, bấm Phân tích ván rồi tự tính lại các nước được chọn. Những thế đó sẽ được lưu để ôn sau."}
            </p>
            <button className="primary-button" onClick={onPlay}>
              <Swords size={17} /> Chơi một ván
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
                  <CalendarClock size={15} />{" "}
                  {practiceDueLabel(active.dueAt, now)}
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
                    ? "Đã mở nước Pikafish chọn"
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
                  <span>
                    THẾ {sessionIndex + 1}/{sessionIds.length}
                  </span>
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
                    Chênh lệch Pikafish tính lúc phân tích ván:{" "}
                    {(active.lossCp / 100).toFixed(2)} điểm. Đây là đánh giá thế
                    cờ ở lần tính đã lưu.
                  </p>
                )}
              </section>

              {!revealed ? (
                <section className="today-task">
                  <h3>Nhìn thế cờ, tự tính trước.</h3>
                  <p>
                    Tìm nước chiếu, nước ăn quân và nước đối thủ có thể đáp. Thử
                    tính lại nước đáp, đừng chỉ nhớ nước đã xem.
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
                  {active.lastAttemptKind === "repeated" && (
                    <p>
                      Bạn đang thử lại trước hạn ôn. Lần này không làm lùi lịch
                      ôn.
                    </p>
                  )}
                  <p>Lần ôn tiếp: {practiceDueLabel(active.dueAt, now)}.</p>
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
                    {describeLine(
                      active.rootFen,
                      active.bestLine.slice(0, 5),
                    ).join(" · ")}
                  </p>
                  <p className="today-provenance">
                    {active.engineBuild} · {active.engineBudgetMs} ms
                  </p>
                  <button className="primary-button" onClick={nextCard}>
                    {sessionIndex + 1 >= sessionIds.length
                      ? "Xong buổi ôn"
                      : "Thế tiếp theo"}{" "}
                    <ChevronRight size={16} />
                  </button>
                </section>
              )}

              <section
                className="today-pattern-profile"
                aria-label="Dấu hiệu lặp lại từ các ván đã lưu"
              >
                <div className="section-label">
                  <span>DẤU HIỆU TRONG CÁC VÁN ĐÃ LƯU</span>
                  <small>{evidenceProfile.totalPositions} thế</small>
                </div>
                <p className="today-pattern-caveat">
                  {profileSampleNote(evidenceProfile.sample)}
                </p>
                {visiblePatterns.length ? (
                  <div className="today-pattern-list">
                    {visiblePatterns.map((pattern) => (
                      <article
                        key={pattern.tag}
                        className={`today-pattern-item evidence-${pattern.evidence}`}
                      >
                        <div>
                          <strong>{pattern.label}</strong>
                          <span>{patternEvidenceLabel(pattern)}</span>
                        </div>
                        <dl>
                          <div>
                            <dt>Thế đã gặp</dt>
                            <dd>{pattern.positions}</dd>
                          </div>
                          <div>
                            <dt>Lần chọn khác</dt>
                            <dd>{pattern.failedAttempts}</dd>
                          </div>
                          <div>
                            <dt>Đến hạn</dt>
                            <dd>{pattern.duePositions}</dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="muted">
                    Chưa có tín hiệu lỗi đủ để xếp hạng. Nước tốt vẫn được lưu
                    để ôn nhưng không bị biến thành “điểm yếu”.
                  </p>
                )}
              </section>

              <section className="today-history-note">
                <RefreshCw size={15} />
                <p>
                  Chọn khác nước đã lưu thì ôn lại sớm. Tìm đúng khi đến hạn thì
                  lần ôn sau cách xa hơn. Thử lại ngay sau khi xem đáp án không
                  làm lùi lịch ôn.
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
