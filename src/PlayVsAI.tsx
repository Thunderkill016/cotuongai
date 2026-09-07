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
import { deriveBattleCue } from "./battleCue";
import {
  START_FEN,
  position,
  replay,
  describeMove,
  describeLine,
} from "./chess";
import { EngineClient, scoreLabel } from "./engine";
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
import {
  evaluationLossCp,
  planReviewCandidates,
  selectReviewMoments,
  type ReviewEvidence,
  type ReviewMoment,
} from "./gameReview";
import {
  GAME_PRACTICE_STORAGE_KEY,
  ingestReviewMoment,
  parsePracticeCards,
} from "./practiceMemory";
import "./play.css";
import {
  createGame,
  exportGameFile,
  importGameFile,
  MAX_GAME_FILE_BYTES,
  type LocalGame,
  GAME_STORAGE_KEY,
  parseLocalGame,
  type GameMode,
} from "./game";

interface PlayVsAIProps {
  onExit: () => void;
}

export function PlayVsAI({ onExit }: PlayVsAIProps) {
  const [initialGame] = useState(() => {
    try {
      return (
        parseLocalGame(localStorage.getItem(GAME_STORAGE_KEY)) ?? createGame()
      );
    } catch {
      return createGame();
    }
  });
  const [humanSide, setHumanSide] = useState<PlayerSide>(initialGame.humanSide);
  const [moves, setMoves] = useState<string[]>(initialGame.moves);
  const [resigned, setResigned] = useState(initialGame.resigned);
  const [gameMode, setGameMode] = useState<GameMode>(initialGame.mode);
  const [storageWarning, setStorageWarning] = useState("");
  const [fileProposal, setFileProposal] = useState<LocalGame | null>(null);
  const [fileMessage, setFileMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const fileReadTicket = useRef(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(initialGame.humanSide === "b");
  const [aiThinking, setAiThinking] = useState(false);
  const [engineState, setEngineState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [engineError, setEngineError] = useState("");
  const [aiError, setAiError] = useState("");
  const [message, setMessage] = useState("");
  const [reviewPly, setReviewPly] = useState<number | null>(null);
  const [reviewStatus, setReviewStatus] = useState<
    "idle" | "analyzing" | "ready" | "error"
  >("idle");
  const [reviewMoments, setReviewMoments] = useState<ReviewMoment[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewSelected, setReviewSelected] = useState<string | null>(null);
  const [reviewGuess, setReviewGuess] = useState<string | null>(null);
  const [reviewRevealed, setReviewRevealed] = useState(false);
  const [reviewProgress, setReviewProgress] = useState({ done: 0, total: 0 });
  const [reviewError, setReviewError] = useState("");
  const engine = useRef<EngineClient | null>(null);
  const epoch = useRef(0);

  const snapshot = useMemo(() => currentSnapshot(moves), [moves]);
  const liveGame = useMemo(() => position(START_FEN, moves), [moves]);
  const humanCanMove = !resigned && canHumanMove(moves, humanSide, aiThinking);
  const activeReview =
    reviewStatus === "ready" ? (reviewMoments[reviewIndex] ?? null) : null;
  const drillGame = useMemo(
    () => (activeReview ? position(activeReview.candidate.rootFen) : null),
    [activeReview],
  );
  const reviewMoves = reviewPly === null ? moves : moves.slice(0, reviewPly);
  const displayFen = activeReview
    ? reviewRevealed
      ? replay(activeReview.candidate.rootFen, [activeReview.candidate.move])
      : activeReview.candidate.rootFen
    : fenAfter(reviewMoves);
  const displayedLastMove = activeReview
    ? reviewRevealed
      ? activeReview.candidate.move
      : null
    : (reviewMoves.at(-1) ?? null);
  const displayedMoveEffect = activeReview
    ? reviewRevealed
      ? activeReview.candidate.cue
      : null
    : displayedLastMove
      ? deriveBattleCue(fenAfter(reviewMoves.slice(0, -1)), displayedLastMove)
      : null;
  const destinations = activeReview
    ? !reviewRevealed && reviewSelected && drillGame
      ? drillGame.moves({ square: reviewSelected }).map((move) => move.slice(2))
      : []
    : reviewPly === null && selected && humanCanMove
      ? liveGame.moves({ square: selected }).map((move) => move.slice(2))
      : [];
  const rows = moveListRows(moves);
  const historyLabels = useMemo(() => describeLine(START_FEN, moves), [moves]);
  const moveLabel = (move: string | null) =>
    move
      ? describeMove(activeReview?.candidate.rootFen ?? liveGame.fen(), move)
      : "—";
  const canUndo =
    !resigned &&
    gameMode === "practice" &&
    (humanSide === "r" ? moves.length >= 1 : moves.length >= 2);

  useEffect(() => {
    try {
      localStorage.setItem(
        GAME_STORAGE_KEY,
        JSON.stringify({
          version: 1,
          humanSide,
          mode: gameMode,
          moves,
          resigned,
        }),
      );
    } catch {
      setStorageWarning(
        "Không lưu được ván trên trình duyệt. Hãy giữ trang này mở để chơi tiếp.",
      );
    }
  }, [humanSide, gameMode, moves, resigned]);

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
      resigned ||
      reviewPly !== null ||
      reviewStatus !== "idle" ||
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
          setAiError(
            "Pikafish không trả về nước đi. Hãy thử lại hoặc bắt đầu ván mới.",
          );
          return;
        }
        setMoves((current) => {
          if (ticket !== epoch.current || current.join("|") !== historyKey)
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
        if (ticket !== epoch.current || (error as Error).name === "AbortError")
          return;
        setAiError(
          (error as Error).message || "Pikafish không thể đi nước này.",
        );
      })
      .finally(() => {
        if (ticket === epoch.current) setAiThinking(false);
      });
  }, [
    moves,
    humanSide,
    engineState,
    aiThinking,
    aiError,
    reviewPly,
    reviewStatus,
    resigned,
  ]);

  function cancelPending() {
    ++epoch.current;
    engine.current?.cancel();
    setAiThinking(false);
  }

  function resetReview() {
    setReviewStatus("idle");
    setReviewMoments([]);
    setReviewIndex(0);
    setReviewSelected(null);
    setReviewGuess(null);
    setReviewRevealed(false);
    setReviewProgress({ done: 0, total: 0 });
    setReviewError("");
  }

  function newGame(side: PlayerSide = humanSide) {
    cancelPending();
    resetReview();
    setHumanSide(side);
    setMoves([]);
    setResigned(false);
    setSelected(null);
    setAiError("");
    setMessage("");
    setReviewPly(null);
    setFlipped(side === "b");
  }

  function downloadGame() {
    try {
      const text = exportGameFile({
        version: 1,
        humanSide,
        mode: gameMode,
        moves,
        resigned,
      });
      const url = URL.createObjectURL(
        new Blob([text], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "ky-lo-van-co.json";
      link.click();
      URL.revokeObjectURL(url);
      setFileMessage("Đã tạo tệp ván cờ.");
    } catch (error) {
      setFileMessage((error as Error).message);
    }
  }

  async function readGameFile(file: File) {
    const ticket = ++fileReadTicket.current;
    setFileProposal(null);
    setFileMessage("");
    try {
      if (file.size > MAX_GAME_FILE_BYTES)
        throw new Error("Tệp ván cờ quá lớn. Chỉ nhận tối đa 20 KB.");
      const loaded = importGameFile(await file.text());
      if (ticket === fileReadTicket.current) setFileProposal(loaded);
    } catch (error) {
      if (ticket === fileReadTicket.current)
        setFileMessage((error as Error).message);
    }
  }

  function openProposedGame() {
    if (!fileProposal) return;
    cancelPending();
    resetReview();
    setHumanSide(fileProposal.humanSide);
    setMoves(fileProposal.moves);
    setResigned(fileProposal.resigned);
    setGameMode(fileProposal.mode);
    setSelected(null);
    setAiError("");
    setMessage("");
    setFlipped(fileProposal.humanSide === "b");
    // Open in replay so importing never silently starts an engine turn.
    setReviewPly(fileProposal.moves.length);
    setFileProposal(null);
    setFileMessage(
      !fileProposal.resigned &&
        currentSnapshot(fileProposal.moves).phase === "playing"
        ? "Đã mở ván để xem lại. Bấm Về ván đấu nếu muốn chơi tiếp."
        : "Đã mở ván để xem lại.",
    );
  }

  function undo() {
    if (!canUndo) return;
    cancelPending();
    resetReview();
    setMoves((current) => undoToHumanTurn(current, humanSide));
    setSelected(null);
    setAiError("");
    setMessage("");
    setReviewPly(null);
  }

  function clickSquare(square: string) {
    if (activeReview) {
      if (reviewRevealed || !drillGame) return;
      setMessage("");
      const piece = drillGame.get(square);
      if (piece?.color === humanSide) {
        setReviewSelected((current) => (current === square ? null : square));
        setReviewGuess(null);
        return;
      }
      if (!reviewSelected) {
        setMessage(`Chọn một quân ${sideName(humanSide)} để tính lại.`);
        return;
      }
      const guess = `${reviewSelected}${square}`;
      if (!drillGame.moves().includes(guess)) {
        setMessage("Nước này không hợp lệ trong thế cần ôn lại.");
        return;
      }
      setReviewGuess(guess);
      setReviewSelected(null);
      return;
    }
    if (reviewPly !== null || reviewStatus === "analyzing") return;
    if (!humanCanMove) {
      if (aiThinking)
        setMessage("Pikafish đang đi. Chờ nước đáp xong rồi ra lệnh tiếp.");
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

  async function analyzeGameReview() {
    const client = engine.current;
    if (!client || engineState !== "ready") {
      setReviewError("Pikafish chưa sẵn sàng để phân tích ván này.");
      setReviewStatus("error");
      return;
    }
    if (!moves.length) return;

    cancelPending();
    const ticket = ++epoch.current;
    setSelected(null);
    setReviewPly(null);
    setReviewStatus("analyzing");
    setReviewMoments([]);
    setReviewIndex(0);
    setReviewGuess(null);
    setReviewSelected(null);
    setReviewRevealed(false);
    setReviewError("");
    setMessage("");

    const candidates = planReviewCandidates(moves, humanSide, 9);
    setReviewProgress({ done: 0, total: candidates.length });
    const evidence: ReviewEvidence[] = [];

    try {
      for (let index = 0; index < candidates.length; index++) {
        if (ticket !== epoch.current) return;
        const candidate = candidates[index];
        try {
          const best = await client.analyze(START_FEN, candidate.history);
          if (ticket !== epoch.current) return;
          const bestLine = best.lines[0];
          if (!best.bestmove || !bestLine) continue;

          let playedLine = best.lines.find(
            (line) => line.pv[0] === candidate.move,
          );
          if (!playedLine) {
            const played = await client.analyze(
              START_FEN,
              candidate.history,
              candidate.move,
            );
            if (ticket !== epoch.current) return;
            playedLine = played.lines[0];
          }
          if (!playedLine) continue;

          evidence.push({
            candidate,
            bestmove: best.bestmove,
            bestScore: bestLine.score,
            playedScore: playedLine.score,
            bestLine: bestLine.pv,
            playedLine: playedLine.pv,
            lossCp: evaluationLossCp(bestLine.score, playedLine.score),
          });
        } catch (error) {
          if ((error as Error).name === "AbortError") {
            if (ticket !== epoch.current) return;
            throw error;
          }
          // One un-analyzable position must not discard the whole game review.
        } finally {
          if (ticket === epoch.current)
            setReviewProgress({ done: index + 1, total: candidates.length });
        }
      }

      if (ticket !== epoch.current) return;
      const moments = selectReviewMoments(evidence);
      if (!moments.length)
        throw new Error(
          "Chưa lấy được đủ dữ liệu engine hợp lệ để ôn lại ván này.",
        );
      setReviewMoments(moments);
      setReviewIndex(0);
      setReviewStatus("ready");
    } catch (error) {
      if (ticket !== epoch.current || (error as Error).name === "AbortError")
        return;
      setReviewError(
        (error as Error).message || "Không thể phân tích ván lúc này.",
      );
      setReviewStatus("error");
    }
  }

  function revealReviewAnswer() {
    if (!activeReview || !reviewGuess) return;
    try {
      const stored = parsePracticeCards(
        localStorage.getItem(GAME_PRACTICE_STORAGE_KEY),
      );
      const next = ingestReviewMoment(
        stored,
        activeReview,
        reviewGuess,
        Date.now(),
      );
      localStorage.setItem(GAME_PRACTICE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      setMessage(
        "Đã mở đáp án nhưng trình duyệt không lưu được thế này vào lịch ôn.",
      );
    }
    setReviewRevealed(true);
  }

  function nextReviewMoment() {
    if (!reviewMoments.length) return;
    if (reviewIndex >= reviewMoments.length - 1) {
      resetReview();
      return;
    }
    setReviewIndex((index) => index + 1);
    setReviewSelected(null);
    setReviewGuess(null);
    setReviewRevealed(false);
    setMessage("");
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
    reviewStatus === "analyzing"
      ? `Đang tìm thời điểm đáng học ${reviewProgress.done}/${reviewProgress.total}…`
      : activeReview
        ? `Ôn lại ${reviewIndex + 1}/${reviewMoments.length} — tự tính trước khi xem Pikafish.`
        : reviewPly !== null
          ? `Đang xem lại nước ${reviewPly}/${moves.length}`
          : resigned
            ? `${humanSide === "r" ? "Đen" : "Đỏ"} thắng · bạn đã xin thua.`
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
              Bạn cầm một bên, Pikafish cầm bên còn lại. Chọn quân rồi chọn chỗ
              muốn đi.
            </p>
          </div>
          <div
            className={`play-turn-card ${snapshot.inCheck ? "is-check" : ""}`}
          >
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
                Bạn cầm {sideName(humanSide)} ·{" "}
                {resigned || snapshot.phase === "finished"
                  ? "Ván đã dừng"
                  : `${sideName(snapshot.turn)} tới lượt`}
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
              selected={
                activeReview
                  ? reviewSelected
                  : reviewPly === null
                    ? selected
                    : null
              }
              destinations={destinations}
              arrow={null}
              lastMove={displayedLastMove}
              moveEffect={displayedMoveEffect}
              onSquare={clickSquare}
              disabled={
                activeReview
                  ? reviewRevealed
                  : reviewStatus === "analyzing" ||
                    reviewPly !== null ||
                    !humanCanMove ||
                    snapshot.phase === "finished"
              }
              flipped={flipped}
            />

            {activeReview ? (
              <div className="board-bottomline play-board-actions review-board-prompt">
                <span>
                  <span className="legend-dot" />
                  {reviewRevealed
                    ? "Đã mở đáp án của thế này"
                    : reviewGuess
                      ? `Nước bạn đang chọn: ${moveLabel(reviewGuess)}`
                      : "Tự chọn nước bạn sẽ đi trong thế này"}
                </span>
              </div>
            ) : reviewPly !== null ? (
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
                <button
                  disabled={resigned || snapshot.phase === "finished"}
                  onClick={() => {
                    cancelPending();
                    resetReview();
                    setResigned(true);
                    setSelected(null);
                  }}
                >
                  Xin thua
                </button>
              </div>
            )}

            {(message || aiError) && (
              <p className="inline-message" role="alert">
                {aiError || message}
              </p>
            )}
            {storageWarning && <p role="alert">{storageWarning}</p>}

            <div
              className={`engine-status ${engineState === "error" || aiError ? "engine-error" : ""}`}
              role="status"
            >
              {engineState === "loading" ||
              aiThinking ||
              reviewStatus === "analyzing" ? (
                <LoaderCircle size={15} className="spin" />
              ) : engineState === "ready" ? (
                <ShieldCheck size={15} />
              ) : (
                <Flag size={15} />
              )}
              <span>
                {engineState === "loading"
                  ? "Đang nạp Pikafish và NNUE…"
                  : reviewStatus === "analyzing"
                    ? `Đang phân tích thế ${reviewProgress.done}/${reviewProgress.total} cho phần ôn sau ván…`
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

          <aside
            className="coach-panel play-match-panel"
            aria-label="Thông tin ván đấu"
          >
            <section className="play-match-card">
              <label>
                Cách chơi{" "}
                <select
                  value={gameMode}
                  disabled={moves.length > 0 || resigned}
                  onChange={(event) =>
                    setGameMode(event.target.value as GameMode)
                  }
                >
                  <option value="practice">Ván luyện · được đi lại</option>
                  <option value="challenge">Tự thử sức · không đi lại</option>
                </select>
              </label>
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
                <div
                  className="play-move-table"
                  role="table"
                  aria-label="Biên bản ván cờ"
                >
                  {rows.map((row) => (
                    <div className="play-move-row" role="row" key={row.number}>
                      <b>{row.number}.</b>
                      <span>{historyLabels[(row.number - 1) * 2] ?? "—"}</span>
                      <span>
                        {historyLabels[(row.number - 1) * 2 + 1] ?? "—"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">Ván chưa có nước đi.</p>
              )}
            </section>

            {(resigned || snapshot.phase === "finished") && (
              <section className="feedback success play-result" role="status">
                <div>
                  <Flag size={20} />
                  <h3>Ván đấu kết thúc</h3>
                </div>
                <p>
                  {resigned
                    ? `${humanSide === "r" ? "Đen" : "Đỏ"} thắng · bạn đã xin thua.`
                    : resultLabel(snapshot.result)}
                </p>
              </section>
            )}

            {reviewStatus !== "idle" && (
              <section className="play-review-study" aria-live="polite">
                {reviewStatus === "analyzing" ? (
                  <>
                    <div className="section-label">
                      <span>ĐANG LỌC THẾ ĐÁNG HỌC</span>
                    </div>
                    <p>
                      Pikafish đang xem tối đa 9 lượt của bạn, không chấm mọi
                      nước để tránh biến review thành một bảng lỗi dài.
                    </p>
                    <div
                      className="review-progress"
                      aria-label="Tiến độ phân tích"
                    >
                      <span
                        style={{
                          width: `${reviewProgress.total ? (reviewProgress.done / reviewProgress.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <small>
                      {reviewProgress.done}/{reviewProgress.total} vị trí đã xem
                    </small>
                  </>
                ) : reviewStatus === "error" ? (
                  <>
                    <div className="section-label">
                      <span>CHƯA PHÂN TÍCH ĐƯỢC</span>
                    </div>
                    <p>{reviewError}</p>
                    <button
                      className="secondary-button"
                      onClick={analyzeGameReview}
                    >
                      <RefreshCw size={15} /> Thử phân tích lại
                    </button>
                  </>
                ) : activeReview ? (
                  <>
                    <div className="section-label review-study-heading">
                      <span>
                        THẾ {reviewIndex + 1}/{reviewMoments.length}
                      </span>
                      <small>Trước nước {activeReview.candidate.ply + 1}</small>
                    </div>
                    {!reviewRevealed ? (
                      <>
                        <h3>Bạn sẽ đi nước nào ở thế này?</h3>
                        <p>
                          Nhìn ý đồ của đối thủ, các nước chiếu/ăn quân trước,
                          rồi chọn một nước trên bàn.
                        </p>
                        <button
                          className="primary-button"
                          disabled={!reviewGuess}
                          onClick={revealReviewAnswer}
                        >
                          <ShieldCheck size={16} /> Chốt nước tôi chọn
                        </button>
                      </>
                    ) : (
                      <>
                        <div className={`review-verdict ${activeReview.kind}`}>
                          {activeReview.kind === "major-miss"
                            ? "Đây là chỗ đáng học nhất"
                            : activeReview.kind === "improvement"
                              ? "Có một nước mạnh hơn đáng kể"
                              : activeReview.kind === "good-find"
                                ? "Trong ván bạn đã tìm đúng nước Pikafish ưu tiên"
                                : "Có phương án khác đáng so sánh"}
                        </div>
                        <dl className="review-comparison">
                          <div>
                            <dt>Trong ván</dt>
                            <dd>{moveLabel(activeReview.candidate.move)}</dd>
                          </div>
                          <div>
                            <dt>Bạn vừa tính</dt>
                            <dd>{moveLabel(reviewGuess)}</dd>
                          </div>
                          <div>
                            <dt>Pikafish</dt>
                            <dd>{moveLabel(activeReview.bestmove)}</dd>
                          </div>
                        </dl>
                        <p className="review-score-line">
                          Đánh giá engine: nước ưu tiên{" "}
                          {scoreLabel(activeReview.bestScore)} · nước đã đi{" "}
                          {scoreLabel(activeReview.playedScore)}
                          {activeReview.lossCp !== null
                            ? ` · chênh ${(activeReview.lossCp / 100).toFixed(2)}`
                            : ""}
                        </p>
                        <p className="review-pv">
                          Biến tham khảo:{" "}
                          {describeLine(
                            activeReview.candidate.rootFen,
                            activeReview.bestLine.slice(0, 4),
                          ).join(" · ")}
                        </p>
                        <button
                          className="primary-button"
                          onClick={nextReviewMoment}
                        >
                          {reviewIndex === reviewMoments.length - 1
                            ? "Kết thúc lượt ôn"
                            : "Thế tiếp theo"}
                          <ChevronRight size={16} />
                        </button>
                      </>
                    )}
                  </>
                ) : null}
              </section>
            )}

            <div className="play-match-actions">
              <button
                className="primary-button"
                disabled={
                  !moves.length ||
                  aiThinking ||
                  reviewStatus === "analyzing" ||
                  engineState !== "ready"
                }
                onClick={analyzeGameReview}
              >
                {reviewStatus === "analyzing" ? (
                  <LoaderCircle size={17} className="spin" />
                ) : (
                  <Sparkles size={17} />
                )}
                Phân tích ván
              </button>
              <button className="secondary-button" onClick={() => newGame()}>
                <RefreshCw size={16} />
                Ván mới
              </button>
            </div>

            <section aria-label="Lưu và mở ván cờ">
              <div className="play-match-actions">
                <button className="secondary-button" onClick={downloadGame}>
                  Lưu ván ra tệp
                </button>
                <button
                  className="secondary-button"
                  onClick={() => fileInput.current?.click()}
                >
                  Mở tệp ván cờ
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".json,application/json"
                  hidden
                  aria-label="Chọn tệp ván Kỳ Lộ"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void readGameFile(file);
                  }}
                />
              </div>
              {fileProposal && (
                <div role="region" aria-label="Ván cờ sắp mở">
                  <p>
                    Ván có {fileProposal.moves.length} nước đi, bạn cầm{" "}
                    {sideName(fileProposal.humanSide)}. Mở tệp sẽ thay ván đang
                    giữ trên máy này. Bạn có thể lưu ván hiện tại trước.
                  </p>
                  <div className="play-match-actions">
                    <button
                      className="primary-button"
                      onClick={openProposedGame}
                    >
                      Mở ván này
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => setFileProposal(null)}
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}
              {fileMessage && <p role="status">{fileMessage}</p>}
            </section>

            <p className="analysis-note play-rules-note">
              Chiếu bí hoặc hết nước đi là thua. Nếu lặp thế, ván sẽ tạm dừng;
              chưa phân xử trường chiếu/trường tróc và không tính là hòa.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}
