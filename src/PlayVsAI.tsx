import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Flag,
  FlipVertical2,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Swords,
} from "lucide-react";
import { Board } from "./Board";
import { START_FEN, position } from "./chess";
import { EngineClient } from "./engine";
import {
  appendLegalMove,
  canHumanMove,
  currentSnapshot,
  fenAfter,
  isAiTurn,
  moveListRows,
  resultLabel,
  sideName,
  undoToHumanTurn,
  type PlayerSide,
} from "./gameSession";
import "./play.css";

interface PlayVsAIProps {
  onExit: () => void;
}

function moveLabel(move: string | null) {
  return move ? `${move.slice(0, 2)} → ${move.slice(2)}` : "—";
}

export function PlayVsAI({ onExit }: PlayVsAIProps) {
  const [humanSide, setHumanSide] = useState<PlayerSide>("r");
  const [moves, setMoves] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [engineState, setEngineState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [engineError, setEngineError] = useState("");
  const [aiError, setAiError] = useState("");
  const [message, setMessage] = useState("");
  const [reviewPly, setReviewPly] = useState<number | null>(null);
  const engine = useRef<EngineClient | null>(null);
  const epoch = useRef(0);

  const snapshot = useMemo(() => currentSnapshot(moves), [moves]);
  const liveGame = useMemo(() => position(START_FEN, moves), [moves]);
  const humanCanMove = canHumanMove(moves, humanSide, aiThinking);
  const reviewMoves = reviewPly === null ? moves : moves.slice(0, reviewPly);
  const displayFen = fenAfter(reviewMoves);
  const displayedLastMove = reviewMoves.at(-1) ?? null;
  const destinations =
    reviewPly === null && selected && humanCanMove
      ? liveGame.moves({ square: selected }).map((move) => move.slice(2))
      : [];
  const rows = moveListRows(moves);
  const canUndo = humanSide === "r" ? moves.length >= 1 : moves.length >= 2;

  useEffect(() => {
    const client = new EngineClient((state, text) => {
      setEngineState(state);
      setEngineError(text || "");
    });
    engine.current = client;
    client.init().catch(() => {});
    return () => {
      ++epoch.current;
      client.dispose();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    if (
      reviewPly !== null ||
      engineState !== "ready" ||
      aiThinking ||
      aiError ||
      !isAiTurn(moves, humanSide)
    )
      return;

    const client = engine.current;
    if (!client) return;
    const ticket = ++epoch.current;
    const history = [...moves];
    const historyKey = history.join("|");
    setAiThinking(true);
    setMessage("");

    client
      .analyze(START_FEN, history)
      .then((analysis) => {
        if (ticket !== epoch.current) return;
        if (!analysis.bestmove) {
          setAiError("Pikafish không trả về nước đi. Hãy thử lại hoặc bắt đầu ván mới.");
          return;
        }
        setMoves((current) => {
          if (
            ticket !== epoch.current ||
            current.join("|") !== historyKey
          )
            return current;
          try {
            return appendLegalMove(current, analysis.bestmove!);
          } catch {
            setAiError(
              "Engine trả về nước không khớp trạng thái bàn cờ. Nước đó đã bị chặn.",
            );
            return current;
          }
        });
      })
      .catch((error) => {
        if (ticket !== epoch.current || (error as Error).name === "AbortError") return;
        setAiError((error as Error).message || "Pikafish không thể đi nước này.");
      })
      .finally(() => {
        if (ticket === epoch.current) setAiThinking(false);
      });
  }, [moves, humanSide, engineState, aiThinking, aiError, reviewPly]);

  function cancelPending() {
    ++epoch.current;
    engine.current?.cancel();
    setAiThinking(false);
  }

  function newGame(side: PlayerSide = humanSide) {
    cancelPending();
    setHumanSide(side);
    setMoves([]);
    setSelected(null);
    setAiError("");
    setMessage("");
    setReviewPly(null);
    setFlipped(side === "b");
  }

  function undo() {
    if (!canUndo) return;
    cancelPending();
    setMoves((current) => undoToHumanTurn(current, humanSide));
    setSelected(null);
    setAiError("");
    setMessage("");
    setReviewPly(null);
  }

  function clickSquare(square: string) {
    if (reviewPly !== null) return;
    if (!humanCanMove) {
      if (aiThinking) setMessage("Pikafish đang đi. Chờ nước đáp xong rồi ra lệnh tiếp.");
      return;
    }
    setMessage("");
    const piece = liveGame.get(square);
    if (piece?.color === humanSide) {
      setSelected((current) => (current === square ? null : square));
      return;
    }
    if (!selected) {
      setMessage(`Chọn một quân ${sideName(humanSide)} trước.`);
      return;
    }
    const move = `${selected}${square}`;
    try {
      const next = appendLegalMove(moves, move);
      setMoves(next);
      setSelected(null);
      setAiError("");
    } catch {
      setMessage("Nước này không hợp lệ. Chọn một điểm được đánh dấu.");
    }
  }

  function retryEngine() {
    setAiError("");
    setMessage("");
    if (engineState === "error") {
      setEngineState("loading");
      engine.current?.init().catch(() => {});
    }
  }

  const statusText =
    reviewPly !== null
      ? `Đang xem lại nước ${reviewPly}/${moves.length}`
      : snapshot.phase === "finished"
        ? resultLabel(snapshot.result)
        : aiThinking
          ? `Pikafish đang tính cho ${sideName(snapshot.turn)}…`
          : snapshot.inCheck
            ? `${sideName(snapshot.turn)} đang bị chiếu Tướng.`
            : snapshot.turn === humanSide
              ? `Tới lượt bạn — ${sideName(humanSide)}.`
              : `Tới lượt Pikafish — ${sideName(snapshot.turn)}.`;

  return (
    <div className="app-shell play-vs-ai-shell">
      <header className="topbar">
        <button className="play-back" type="button" onClick={onExit}>
          <ArrowLeft size={17} />
          Về khu luyện
        </button>
        <div className="brand" aria-label="Kỳ Lộ">
          <span className="brand-seal">將</span>
          <span>
            Kỳ Lộ<span className="brand-sub">ĐẤU PIKAFISH</span>
          </span>
        </div>
        <div className="play-side-switch" aria-label="Chọn bên">
          <button
            className={humanSide === "r" ? "active" : ""}
            onClick={() => newGame("r")}
            type="button"
          >
            Cầm Đỏ
          </button>
          <button
            className={humanSide === "b" ? "active" : ""}
            onClick={() => newGame("b")}
            type="button"
          >
            Cầm Đen
          </button>
        </div>
      </header>

      <main className="play-main">
        <section className="page-heading play-heading">
          <div>
            <div className="eyebrow">VÁN ĐẤU HOÀN CHỈNH</div>
            <h1>Ra quân. Pikafish sẽ đáp lại.</h1>
            <p>
              Chơi từ thế xuất phát chuẩn. Luật bàn cờ quyết định nước hợp lệ;
              Pikafish chỉ chọn nước cho phía máy.
            </p>
          </div>
          <div className={`play-turn-card ${snapshot.inCheck ? "is-check" : ""}`}>
            <Swords size={20} />
            <div>
              <small>TRẠNG THÁI</small>
              <strong>{statusText}</strong>
            </div>
          </div>
        </section>

        <div className="workspace play-workspace">
          <section className="board-section" aria-label="Ván cờ với Pikafish">
            <div className="board-topline">
              <span className="side-label">
                <span
                  className={`side-dot ${snapshot.turn === "r" ? "red-dot" : ""}`}
                />
                Bạn cầm {sideName(humanSide)} · {sideName(snapshot.turn)} tới lượt
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
              selected={reviewPly === null ? selected : null}
              destinations={destinations}
              arrow={null}
              lastMove={displayedLastMove}
              onSquare={clickSquare}
              disabled={
                reviewPly !== null ||
                !humanCanMove ||
                snapshot.phase === "finished"
              }
              flipped={flipped}
            />

            {reviewPly !== null ? (
              <div className="replay-controls play-review-controls">
                <button
                  aria-label="Nước trước"
                  disabled={reviewPly === 0}
                  onClick={() => setReviewPly(Math.max(0, reviewPly - 1))}
                >
                  <ChevronLeft size={20} />
                </button>
                <span>
                  {reviewPly} / {moves.length}
                </span>
                <button
                  aria-label="Nước tiếp"
                  disabled={reviewPly === moves.length}
                  onClick={() =>
                    setReviewPly(Math.min(moves.length, reviewPly + 1))
                  }
                >
                  <ChevronRight size={20} />
                </button>
                <button onClick={() => setReviewPly(null)}>Về ván đấu</button>
              </div>
            ) : (
              <div className="board-bottomline play-board-actions">
                <span>
                  <span className="legend-dot" />Ô đi được
                </span>
                <button onClick={undo} disabled={!canUndo}>
                  <RotateCcw size={15} />
                  Lùi lượt của tôi
                </button>
              </div>
            )}

            {(message || aiError) && (
              <p className="inline-message" role="alert">
                {aiError || message}
              </p>
            )}

            <div
              className={`engine-status ${engineState === "error" || aiError ? "engine-error" : ""}`}
              role="status"
            >
              {engineState === "loading" || aiThinking ? (
                <LoaderCircle size={15} className="spin" />
              ) : engineState === "ready" ? (
                <ShieldCheck size={15} />
              ) : (
                <Flag size={15} />
              )}
              <span>
                {engineState === "loading"
                  ? "Đang nạp Pikafish và NNUE…"
                  : aiThinking
                    ? "Pikafish đang tìm nước đáp trong giới hạn tìm kiếm hiện tại…"
                    : engineState === "error"
                      ? engineError
                      : "Pikafish sẵn sàng · engine chạy trực tiếp trên thiết bị"}
              </span>
              {(engineState === "error" || aiError) && (
                <button onClick={retryEngine}>Thử lại</button>
              )}
            </div>
          </section>

          <aside className="coach-panel play-match-panel" aria-label="Thông tin ván đấu">
            <section className="play-match-card">
              <div className="section-label">
                <span>
                  <Swords size={16} /> VÁN ĐẤU
                </span>
              </div>
              <div className="play-armies">
                <div className={humanSide === "r" ? "human" : "machine"}>
                  <small>ĐỎ</small>
                  <strong>{humanSide === "r" ? "Bạn" : "Pikafish"}</strong>
                </div>
                <span>VS</span>
                <div className={humanSide === "b" ? "human" : "machine"}>
                  <small>ĐEN</small>
                  <strong>{humanSide === "b" ? "Bạn" : "Pikafish"}</strong>
                </div>
              </div>
              <p className="muted play-engine-limit">
                Độ mạnh hiện dùng ngân sách tìm kiếm engine 1,2 giây/lượt. Đây
                không phải Elo đã hiệu chuẩn.
              </p>
            </section>

            <section className="play-move-history">
              <div className="section-label">
                <span>LỊCH SỬ NƯỚC ĐI</span>
                <small>{moves.length} nửa lượt</small>
              </div>
              {rows.length ? (
                <div className="play-move-table" role="table" aria-label="Biên bản ván cờ">
                  {rows.map((row) => (
                    <div className="play-move-row" role="row" key={row.number}>
                      <b>{row.number}.</b>
                      <span>{moveLabel(row.red)}</span>
                      <span>{moveLabel(row.black)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">Ván chưa có nước đi.</p>
              )}
            </section>

            {snapshot.phase === "finished" && (
              <section className="feedback success play-result" role="status">
                <div>
                  <Flag size={20} />
                  <h3>Ván đấu kết thúc</h3>
                </div>
                <p>{resultLabel(snapshot.result)}</p>
              </section>
            )}

            <div className="play-match-actions">
              <button
                className="primary-button"
                disabled={!moves.length}
                onClick={() => {
                  cancelPending();
                  setSelected(null);
                  setReviewPly(moves.length);
                }}
              >
                <Sparkles size={17} />
                Xem lại ván
              </button>
              <button className="secondary-button" onClick={() => newGame()}>
                <RefreshCw size={16} />
                Ván mới
              </button>
            </div>

            <p className="analysis-note play-rules-note">
              Giới hạn luật hiện tại: thư viện đã kiểm nước đi, chiếu bí và hết
              nước; trường chiếu/trường tróc theo luật WXF chưa được phân xử đầy
              đủ. Trường hợp lặp sẽ được dừng và ghi rõ giới hạn này.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}
