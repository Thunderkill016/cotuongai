import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Compass,
  Eye,
  Flag,
  FlipVertical2,
  Lightbulb,
  LoaderCircle,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { Board } from "./Board";
import {
  describeMove,
  inspectMove,
  pieceName,
  position,
  replay,
  START_FEN,
} from "./chess";
import { EngineClient, scoreLabel, type Analysis } from "./engine";
import {
  EXERCISES,
  STORAGE_KEY,
  EXPOSURE_KEY,
  parseExposures,
  nextAttemptOrdinal,
  type Exposures,
  assessAttempt,
  candidateLimit,
  independentSuccesses,
  parseAttempts,
  summarizeSkills,
  type Attempt,
} from "./training";
import { requestCoaching } from "./coach";
import { OPENING_FAMILIES } from "./knowledgeVault";
import { recommendNextPractice } from "./retrieval";

function loadHistory(): Attempt[] {
  try {
    return parseAttempts(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

export default function App() {
  const [mode, setMode] = useState<"training" | "free">("training");
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [moves, setMoves] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [candidate, setCandidate] = useState<string | null>(null);
  const [predictedRecapture, setPredictedRecapture] = useState<boolean | null>(
    null,
  );
  const [played, setPlayed] = useState<string | null>(null);
  const [solutionShown, setSolutionShown] = useState(false);
  const [moveObservation, setMoveObservation] = useState("");
  const [hints, setHints] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [attempts, setAttempts] = useState(loadHistory);
  const [storageWarning, setStorageWarning] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<ReturnType<
    typeof assessAttempt
  > | null>(null);
  const [engineState, setEngineState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [engineError, setEngineError] = useState("");
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [playedAnalysis, setPlayedAnalysis] = useState<Analysis | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [preview, setPreview] = useState<{ line: number; ply: number } | null>(
    null,
  );
  const [coach, setCoach] = useState<{
    text: string;
    source: "ai" | "curated";
  } | null>(null);
  const [coachBusy, setCoachBusy] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [dialog, setDialog] = useState<"progress" | "help" | "openings" | null>(
    null,
  );
  const [showStarterGuide, setShowStarterGuide] = useState(() => {
    try {
      return localStorage.getItem("ky-lo.onboarding.v1") !== "done";
    } catch {
      return true;
    }
  });
  const engine = useRef<EngineClient | null>(null);
  const epoch = useRef(0);
  const coachAbort = useRef<AbortController | null>(null);
  const exposuresInMemory = useRef<Exposures>({});
  const dialogRef = useRef<HTMLDialogElement>(null);
  const exercise = EXERCISES[exerciseIndex];
  const inputFen =
    mode === "training" ? exercise.fen : replay(START_FEN, moves);
  const displayFen =
    preview && analysis
      ? replay(
          analysis.rootFen,
          analysis.lines[preview.line].pv.slice(0, preview.ply),
        )
      : solutionShown && mode === "training"
        ? replay(exercise.fen, [exercise.solution])
        : played && mode === "training"
          ? replay(exercise.fen, [played])
          : inputFen;
  const game = position(displayFen);
  const destinations =
    selected && !played && !preview
      ? game.moves({ square: selected }).map((m) => m.slice(2))
      : [];
  const exerciseAttempts = attempts.filter((a) => a.exerciseId === exercise.id);
  const alreadyExposed = exerciseAttempts.length > 0;
  const recommendation = recommendNextPractice(
    attempts,
    exposuresInMemory.current,
  );
  const skillSummaries = summarizeSkills(attempts);
  const starterGuide =
    showStarterGuide && mode === "training" && exerciseIndex === 0
      ? played
        ? {
            step: 3,
            title: "Bạn vừa đi nước đầu tiên.",
            text: "Xe đỏ vừa ăn Mã. Giờ nhìn xem Đen có quân nào ăn lại Xe ngay được không.",
            squares: ["b3"],
          }
        : candidate === "b0b3"
          ? {
              step: 3,
              title: "Đi nước này nhé.",
              text: "Bạn đã chọn Xe b0 → b3 ăn Mã. Bấm ‘Đi nước này’ để xem Đen đáp ra sao.",
              squares: ["b0", "b3"],
            }
          : selected === "b0"
            ? {
                step: 2,
                title: "Bấm Mã đen để ăn.",
                text: "Các chấm sáng là chỗ Xe đi được. Bấm quân Mã 馬 ở b3 để ăn quân.",
                squares: ["b0", "b3"],
              }
            : {
                step: 1,
                title: "Bạn cầm quân ĐỎ.",
                text: "Bước đầu tiên: bấm quân Xe 車 ở góc dưới bên trái. Xe đi theo đường thẳng.",
                squares: ["b0"],
              }
      : null;
  function dismissStarterGuide() {
    setShowStarterGuide(false);
    try {
      localStorage.setItem("ky-lo.onboarding.v1", "done");
    } catch {}
  }

  useEffect(() => {
    const client = new EngineClient((status, text) => {
      setEngineState(status);
      setEngineError(text || "");
    });
    engine.current = client;
    client.init().catch(() => {}); // Status callback exposes the failure; lessons remain usable.
    return () => {
      client.dispose();
      coachAbort.current?.abort();
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts.slice(-500)));
    } catch {
      setStorageWarning(
        "Trình duyệt không lưu được lịch sử. Kết quả hiện chỉ giữ trong phiên này.",
      );
    }
  }, [attempts]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setAttempts((current) => {
        const merged = new Map(current.map((a) => [a.id, a]));
        for (const a of parseAttempts(event.newValue)) merged.set(a.id, a);
        return [...merged.values()].sort((a, b) => a.at - b.at).slice(-500);
      });
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  useEffect(() => {
    const element = dialogRef.current;
    if (dialog && element && !element.open) element.showModal();
    if (!dialog && element?.open) element.close();
  }, [dialog]);

  function invalidate() {
    epoch.current++;
    engine.current?.cancel();
    coachAbort.current?.abort();
    setBusy(false);
    setCoachBusy(false);
    setAnalysis(null);
    setPlayedAnalysis(null);
    setAnalysisOpen(false);
    setPreview(null);
    setCoach(null);
  }
  function resetTurn() {
    invalidate();
    setSelected(null);
    setCandidate(null);
    setPredictedRecapture(null);
    setCandidates([]);
    setPlayed(null);
    setSolutionShown(false);
    setMoveObservation("");
    setFeedback(null);
    setMessage("");
  }
  function chooseExercise(index: number) {
    resetTurn();
    setExerciseIndex(index);
    setHints(0);
    setRevealed(false);
    setMode("training");
  }
  function changeMode(next: "training" | "free") {
    resetTurn();
    setMode(next);
    setHints(0);
    setRevealed(false);
  }

  function clickSquare(sq: string) {
    if (played || preview || solutionShown || (busy && mode === "free")) return;
    setMessage("");
    const p = game.get(sq);
    if (p?.color === game.turn()) {
      setSelected(sq === selected ? null : sq);
      return;
    }
    if (!selected) {
      setMessage(`Chọn một quân ${game.turn() === "r" ? "đỏ" : "đen"} trước.`);
      return;
    }
    // A new candidate belongs to the current board, not the previous move's review.
    if (mode === "free" && analysis && analysis.rootFen !== inputFen)
      invalidate();
    const uci = selected + sq;
    if (!game.moves().includes(uci)) {
      setMessage(
        "Nước này không hợp lệ. Chọn một điểm được đánh dấu hoặc một quân khác.",
      );
      return;
    }
    if (mode === "training") {
      setCandidates([uci]);
      setCandidate(uci);
      setPredictedRecapture(null);
      setSelected(null);
      return;
    }
    if (
      !candidates.includes(uci) &&
      candidates.length === candidateLimit(false)
    ) {
      setMessage(
        "Bạn đã có 3 nước ứng viên. Bỏ một nước trước khi thêm nước khác.",
      );
      return;
    }
    setCandidates((old) => (old.includes(uci) ? old : [...old, uci]));
    setCandidate(uci);
    setSelected(null);
  }

  async function analyzeMove(
    fen: string,
    move: string | null,
    history: string[] = [],
  ) {
    const ticket = ++epoch.current;
    coachAbort.current?.abort();
    setBusy(true);
    setMessage("");
    setAnalysis(null);
    setPlayedAnalysis(null);
    setCoach(null);
    try {
      const result = await engine.current!.analyze(fen, history);
      if (ticket !== epoch.current) return;
      setAnalysis(result);
      if (move && result.bestmove) {
        const found = result.lines.find((l) => l.pv[0] === move);
        if (found)
          setPlayedAnalysis({ ...result, lines: [found], bestmove: move });
        else {
          const candidateResult = await engine.current!.analyze(
            fen,
            history,
            move,
          );
          if (ticket !== epoch.current) return;
          setPlayedAnalysis(candidateResult);
        }
        const line = result.lines[0];
        const controller = new AbortController();
        coachAbort.current = controller;
        setCoachBusy(true);
        requestCoaching(
          {
            fen: result.rootFen,
            move,
            evidence: {
              bestmove: result.bestmove,
              pv: line.pv,
              depth: line.depth,
              score: line.score,
            },
          },
          controller.signal,
        )
          .then((value) => {
            if (ticket === epoch.current) setCoach(value);
          })
          .catch(() => {}) // Aborted requests belong to a previous board; fallback is handled by the client.
          .finally(() => {
            if (ticket === epoch.current) setCoachBusy(false);
          });
      }
    } catch (error) {
      if (ticket === epoch.current && (error as Error).name !== "AbortError")
        setMessage((error as Error).message);
    } finally {
      if (ticket === epoch.current) setBusy(false);
    }
  }

  function submit() {
    if (
      !candidate ||
      played ||
      preview ||
      solutionShown ||
      busy ||
      (mode === "training" && predictedRecapture === null)
    )
      return;
    const move = candidate;
    const root = inputFen;
    setAnalysisOpen(false);
    setPreview(null);
    if (mode === "training") {
      const prediction = predictedRecapture;
      if (prediction === null) return;
      const result = assessAttempt(exercise.fen, move, prediction);
      setPlayed(move);
      setFeedback(result);
      setAttempts((old) => {
        let stored: Attempt[] = [];
        let exposure = { hints, revealed };
        let exposures = exposuresInMemory.current;
        try {
          stored = parseAttempts(localStorage.getItem(STORAGE_KEY));
          exposures = {
            ...exposures,
            ...parseExposures(localStorage.getItem(EXPOSURE_KEY)),
          };
        } catch {
          /* The visible storage warning covers disabled storage. */
        }
        const merged = [
          ...new Map([...stored, ...old].map((a) => [a.id, a])).values(),
        ];
        const previous = exposures[exercise.id];
        if (previous)
          exposure = {
            hints: Math.max(hints, previous.hints),
            revealed: revealed || previous.revealed,
          };
        const ordinal = nextAttemptOrdinal(exercise.id, merged, exposures);
        exposures[exercise.id] = { ...exposure, attempts: ordinal };
        exposuresInMemory.current = exposures;
        try {
          localStorage.setItem(EXPOSURE_KEY, JSON.stringify(exposures));
        } catch {
          /* Keep in-memory exposure when persistent storage is unavailable. */
        }
        return [
          ...merged,
          {
            id: crypto.randomUUID(),
            exerciseId: exercise.id,
            move,
            success: result.success,
            predictedRecapture: prediction,
            ...exposure,
            ordinal,
            at: Date.now(),
          },
        ];
      });
      void analyzeMove(root, move);
    } else {
      const observed = inspectMove(root, move);
      setMoveObservation(
        `${describeMove(root, move)}. ${observed.check ? "Nước này chiếu Tướng đối phương. " : ""}${observed.recaptures.length ? `Đối phương có thể bắt lại quân vừa đi bằng ${observed.recaptures[0].from} → ${observed.recaptures[0].to}.` : "Đối phương không có nước bắt lại ngay quân vừa đi. Điều này chưa chứng minh nước đi là tốt nhất."}`,
      );
      const previous = [...moves];
      setMoves([...moves, move]);
      setCandidates([]);
      setCandidate(null);
      setSelected(null);
      void analyzeMove(START_FEN, move, previous);
    }
  }

  function recordExposure(nextHints: number, nextRevealed: boolean) {
    if (mode !== "training") return;
    let exposures = exposuresInMemory.current;
    try {
      exposures = {
        ...exposures,
        ...parseExposures(localStorage.getItem(EXPOSURE_KEY)),
      };
      const old = exposures[exercise.id];
      exposures[exercise.id] = {
        hints: Math.max(old?.hints || 0, nextHints),
        revealed: !!old?.revealed || nextRevealed,
        attempts: old?.attempts || 0,
      };
      exposuresInMemory.current = exposures;
      localStorage.setItem(EXPOSURE_KEY, JSON.stringify(exposures));
    } catch {
      const old = exposures[exercise.id];
      exposures[exercise.id] = {
        hints: Math.max(old?.hints || 0, nextHints),
        revealed: !!old?.revealed || nextRevealed,
        attempts: old?.attempts || 0,
      };
      exposuresInMemory.current = exposures;
      setStorageWarning(
        "Không lưu được việc đã xem trợ giúp. Kết quả chỉ có ý nghĩa trong phiên này.",
      );
    }
  }

  function reveal() {
    recordExposure(hints, true);
    setRevealed(true);
    setAnalysisOpen(true);
    setSelected(null);
    if (!analysis && !busy)
      void analyzeMove(
        mode === "training" ? exercise.fen : START_FEN,
        mode === "training" ? played : null,
        mode === "free" ? moves : [],
      );
  }
  function undo() {
    resetTurn();
    if (mode === "free") setMoves((old) => old.slice(0, -1));
  }
  async function machineMove() {
    resetTurn();
    const ticket = epoch.current;
    setBusy(true);
    try {
      const result = await engine.current!.analyze(START_FEN, moves);
      if (ticket !== epoch.current) return;
      if (result.bestmove) setMoves((old) => [...old, result.bestmove!]);
      else setMessage("Bên tới lượt không còn nước hợp lệ.");
    } catch (error) {
      if (ticket === epoch.current && (error as Error).name !== "AbortError")
        setMessage((error as Error).message);
    } finally {
      if (ticket === epoch.current) setBusy(false);
    }
  }
  const currentSide = position(inputFen).turn() === "r" ? "Đỏ" : "Đen";
  const previewLine = preview && analysis ? analysis.lines[preview.line] : null;
  const boardArrow =
    preview && previewLine && preview.ply < previewLine.pv.length
      ? previewLine.pv[preview.ply]
      : !played
        ? candidate
        : null;
  const sideInAnalysis = analysis
    ? position(analysis.rootFen).turn() === "r"
      ? "Đỏ"
      : "Đen"
    : currentSide;
  const terminal = game.in_checkmate()
    ? "Chiếu bí. Bên tới lượt đã thua."
    : game.in_stalemate()
      ? "Hết nước hợp lệ. Bên tới lượt đã thua."
      : game.in_check()
        ? "Bên tới lượt đang bị chiếu."
        : "";

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Kỳ Lộ, về đầu buổi luyện">
          <span className="brand-seal">馬</span>
          <span>
            Kỳ Lộ<span className="brand-sub">LUYỆN TƯ DUY CỜ TƯỚNG</span>
          </span>
        </a>
        <nav className="main-nav" aria-label="Chế độ">
          <button
            onClick={() => {
              window.location.hash = "/play";
            }}
          >
            Chơi với máy
          </button>
          <button
            className={mode === "training" ? "active" : ""}
            onClick={() => changeMode("training")}
          >
            <BookOpen size={17} />
            Luyện tập
          </button>
          <button
            className={mode === "free" ? "active" : ""}
            onClick={() => changeMode("free")}
          >
            <Compass size={17} />
            Bàn tự do
          </button>
          <button onClick={() => setDialog("openings")}>
            <BookOpen size={17} />
            Khai cuộc
          </button>
        </nav>
        <button className="progress-link" onClick={() => setDialog("progress")}>
          <Target size={18} />
          <span>Tiến trình</span>
        </button>
      </header>

      <main>
        <section className="page-heading">
          <div>
            <div className="eyebrow">
              {mode === "training" ? "BÀI NHẬP MÔN" : "BÀN PHÂN TÍCH"}
            </div>
            <h1>
              {mode === "training"
                ? "Tập nhìn trước một nước."
                : "Tự bày cờ và tính nước."}
            </h1>
            <p>
              {mode === "training"
                ? "Ăn quân chưa đủ — hãy nhìn xem đối thủ đáp lại thế nào."
                : "Đi thử các nước của hai bên, hoặc để Pikafish tính tiếp."}
            </p>
          </div>
          <button className="help-link" onClick={() => setDialog("help")}>
            <CircleHelp size={18} />
            Cách dùng bàn cờ
          </button>
        </section>
        <div className="workspace">
          <section className="board-section" aria-label="Khu vực bàn cờ">
            {starterGuide && (
              <aside className="starter-guide" aria-live="polite">
                <div className="starter-step">
                  BẮT ĐẦU · {starterGuide.step}/3
                </div>
                <div>
                  <strong>{starterGuide.title}</strong>
                  <p>{starterGuide.text}</p>
                </div>
                <button type="button" onClick={dismissStarterGuide}>
                  {played ? "Đã hiểu" : "Ẩn hướng dẫn"}
                </button>
              </aside>
            )}
            <div className="board-topline">
              <span className="side-label">
                <span
                  className={`side-dot ${game.turn() === "r" ? "red-dot" : ""}`}
                />
                {solutionShown
                  ? "Đang xem lời giải của bài"
                  : preview
                    ? "Đang xem biến thể"
                    : played
                      ? "Sau nước bạn chọn"
                      : mode === "training"
                        ? `Bạn cầm ${currentSide} • ${currentSide} đi`
                        : `${currentSide} tới lượt`}
              </span>
              <button
                className="icon-button"
                title="Xoay bàn cờ"
                aria-label="Xoay bàn cờ"
                onClick={() => setFlipped((v) => !v)}
              >
                <FlipVertical2 size={18} />
              </button>
            </div>
            <Board
              fen={displayFen}
              selected={selected}
              destinations={destinations}
              arrow={boardArrow}
              lastMove={
                preview && previewLine && preview.ply
                  ? previewLine.pv[preview.ply - 1]
                  : played || moves.at(-1)
              }
              onSquare={clickSquare}
              disabled={
                !!played ||
                !!preview ||
                solutionShown ||
                (busy && mode === "free")
              }
              flipped={flipped}
              tutorialSquares={starterGuide?.squares}
            />
            {preview && previewLine ? (
              <div className="replay-controls">
                <button
                  aria-label="Biến thể: nước trước"
                  disabled={preview.ply === 0}
                  onClick={() =>
                    setPreview({ ...preview, ply: preview.ply - 1 })
                  }
                >
                  <ChevronLeft size={20} />
                </button>
                <span>
                  Nước {preview.ply} / {previewLine.pv.length}
                </span>
                <button
                  aria-label="Biến thể: nước tiếp"
                  disabled={preview.ply === previewLine.pv.length}
                  onClick={() =>
                    setPreview({ ...preview, ply: preview.ply + 1 })
                  }
                >
                  <ChevronRight size={20} />
                </button>
                <button onClick={() => setPreview(null)}>Về bài luyện</button>
              </div>
            ) : (
              <div className="board-bottomline">
                <span>
                  <span className="legend-dot" />Ô đi được
                </span>
                <button
                  onClick={undo}
                  disabled={
                    !played &&
                    !solutionShown &&
                    (mode !== "free" || !moves.length)
                  }
                >
                  <RotateCcw size={15} />
                  {mode === "training" ? "Thử lại" : "Lùi một nước"}
                </button>
              </div>
            )}
            {terminal && (
              <p className="inline-message" role="status">
                {terminal}
              </p>
            )}
            <div
              className={`engine-status ${engineState === "error" ? "engine-error" : ""}`}
              role="status"
            >
              {engineState === "loading" || busy ? (
                <LoaderCircle size={15} className="spin" />
              ) : (
                <ShieldCheck size={15} />
              )}
              <span>
                {engineState === "loading"
                  ? "Đang nạp Pikafish… Bạn vẫn có thể làm bài ngay."
                  : engineState === "error"
                    ? engineError
                    : busy
                      ? "Pikafish đang tính các nước…"
                      : "Pikafish đã sẵn sàng · tính trực tiếp trên máy bạn"}
              </span>
              {engineState === "error" && (
                <button onClick={() => engine.current?.init().catch(() => {})}>
                  Nạp lại
                </button>
              )}
            </div>
          </section>

          <aside className="coach-panel" aria-label="Huấn luyện và gợi ý">
            <div className="lesson-head">
              <span className="chapter-number">
                {mode === "training" ? `0${exerciseIndex + 1}` : "∞"}
              </span>
              <div>
                <span className="eyebrow">
                  {mode === "training"
                    ? `${exercise.kind === "transfer" ? "TỰ LÀM" : "CÓ HƯỚNG DẪN"} · ${exerciseIndex + 1}/${EXERCISES.length}`
                    : "TỰ KHÁM PHÁ"}
                </span>
                <h2>
                  {mode === "training" ? exercise.title : "Bàn cờ của bạn"}
                </h2>
              </div>
            </div>
            <p className="lesson-description">
              {mode === "training"
                ? exercise.description
                : "Có thể tính trước tối đa 3 nước. Chỉ mở Pikafish khi bạn muốn xem."}
            </p>
            {mode === "training" && (
              <p className="lesson-provenance">{exercise.provenanceNote}</p>
            )}
            {mode === "training" && (
              <section className="lesson-how-to" aria-label="Cách làm bài">
                <strong>Bài này làm thế nào?</strong>
                <ol>
                  <li>Nhìn mục tiêu: {exercise.concept}</li>
                  <li>Chạm quân Đỏ, rồi chạm ô muốn đi.</li>
                  <li>
                    Bấm <b>Đi nước này</b> để xem Đen có ăn lại ngay không.
                  </li>
                </ol>
              </section>
            )}
            {mode === "training" && (
              <div className="lesson-track" aria-label="Chọn bài">
                {EXERCISES.map((ex, i) => (
                  <button
                    key={ex.id}
                    aria-label={`Bài ${i + 1}: ${ex.title}`}
                    aria-current={i === exerciseIndex ? "step" : undefined}
                    className={i === exerciseIndex ? "current" : ""}
                    onClick={() => chooseExercise(i)}
                  >
                    <span>{i + 1}</span>
                  </button>
                ))}
              </div>
            )}

            {!played && !preview && !solutionShown && (
              <section className="think-section">
                <div className="section-label">
                  <span>
                    <ScanLine size={17} />
                    {mode === "training"
                      ? "NƯỚC BẠN CHỌN"
                      : "CÁC NƯỚC ĐANG TÍNH"}
                  </span>
                  <span>
                    {mode === "training"
                      ? candidates.length
                        ? "Đã chọn 1 nước"
                        : "Chọn 1 nước"
                      : `${candidates.length}/3 nước`}
                  </span>
                </div>
                {candidates.length ? (
                  <div className="candidate-list">
                    {candidates.map((move, i) => (
                      <div
                        className={`candidate-row ${move === candidate ? "chosen" : ""}`}
                        key={move}
                      >
                        <button
                          onClick={() => {
                            setCandidate(move);
                            setPredictedRecapture(null);
                          }}
                          aria-pressed={move === candidate}
                        >
                          <span className="candidate-number">{i + 1}</span>
                          {describeMove(inputFen, move)}
                        </button>
                        <button
                          aria-label={`Bỏ nước ${move}`}
                          onClick={() => {
                            setCandidates((old) =>
                              old.filter((m) => m !== move),
                            );
                            if (candidate === move) {
                              setCandidate(null);
                              setPredictedRecapture(null);
                            }
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-candidate">
                    <span className="small-board-mark">＋</span>
                    <p>
                      Chạm quân Đỏ,
                      <br />
                      rồi chọn điểm muốn đi.
                    </p>
                  </div>
                )}
                {mode === "training" && candidate && (
                  <fieldset className="reply-prediction">
                    <legend>
                      Trước khi chốt: Đen có ăn lại quân bạn vừa đi ngay không?
                    </legend>
                    <div>
                      <button
                        type="button"
                        aria-pressed={predictedRecapture === true}
                        className={predictedRecapture === true ? "chosen" : ""}
                        onClick={() => setPredictedRecapture(true)}
                      >
                        Có, Đen ăn lại được
                      </button>
                      <button
                        type="button"
                        aria-pressed={predictedRecapture === false}
                        className={predictedRecapture === false ? "chosen" : ""}
                        onClick={() => setPredictedRecapture(false)}
                      >
                        Không, chưa ăn lại được
                      </button>
                    </div>
                    <small>Đoán trước rồi mới xem kết quả.</small>
                  </fieldset>
                )}
                <button
                  className="primary-button"
                  onClick={submit}
                  disabled={
                    !candidate ||
                    busy ||
                    (mode === "training" && predictedRecapture === null)
                  }
                >
                  {mode === "training"
                    ? predictedRecapture === null
                      ? "Đoán nước đáp trước"
                      : "Chốt nước và xem Đen đáp"
                    : "Đi nước này"}
                  <ArrowRight size={18} />
                </button>
              </section>
            )}

            {feedback && (
              <section
                className={`feedback ${feedback.success ? "success" : "retry"}`}
                role="status"
              >
                <div>
                  {feedback.success ? (
                    <Check size={20} />
                  ) : (
                    <CircleHelp size={20} />
                  )}
                  <h3>{feedback.message}</h3>
                </div>
                <p>{feedback.detail}</p>
                {feedback.prediction && (
                  <p className="prediction-result">
                    <strong>
                      {feedback.prediction.correct
                        ? "Bạn đoán đúng."
                        : "Lần này đoán chưa đúng."}
                    </strong>{" "}
                    {feedback.prediction.detail}
                  </p>
                )}
                <button className="text-button" onClick={() => resetTurn()}>
                  <RotateCcw size={15} />
                  Thử một nước khác
                </button>
              </section>
            )}

            {message && (
              <p className="inline-message" role="alert">
                {message}
              </p>
            )}
            {moveObservation && mode === "free" && (
              <section className="move-observation">
                <strong>Sau nước vừa đi</strong>
                <p>{moveObservation}</p>
              </section>
            )}
            {mode === "training" && (
              <section className="hint-section">
                <div className="hint-title">
                  <Lightbulb size={18} />
                  <strong>Gợi ý</strong>
                  <span>{hints}/3</span>
                </div>
                {hints ? (
                  <p>{exercise.hints[hints - 1]}</p>
                ) : (
                  <p>
                    Chưa cần tìm nước hay nhất. Trước hết nhìn xem quân nào đang
                    có thể ăn quân đối thủ.
                  </p>
                )}
                <button
                  className="secondary-button"
                  disabled={hints === 3 || !!preview}
                  onClick={() => {
                    const next = Math.min(3, hints + 1);
                    recordExposure(next, revealed);
                    setHints(next);
                  }}
                >
                  {hints === 0
                    ? "Gợi ý một chút"
                    : hints < 3
                      ? "Gợi ý rõ hơn"
                      : "Đã mở hết gợi ý"}
                  <ArrowUpRight size={16} />
                </button>
              </section>
            )}

            {(coachBusy || coach) && (
              <section className="ai-question">
                <div className="section-label">
                  <span>
                    <Sparkles size={16} />
                    {coachBusy
                      ? "ĐANG CHỌN GỢI Ý"
                      : coach?.source === "ai"
                        ? "GỢI Ý TỪ AI"
                        : "GỢI Ý LUYỆN CỜ"}
                  </span>
                </div>
                <p>
                  {coachBusy
                    ? "Trong lúc chờ, thử nghĩ xem đối thủ sẽ đáp nước nào."
                    : coach?.text}
                </p>
              </section>
            )}

            <div className="reveal-row">
              <button
                onClick={() =>
                  analysisOpen ? setAnalysisOpen(false) : reveal()
                }
              >
                <Eye size={17} />
                {analysisOpen
                  ? "Ẩn phân tích"
                  : mode === "training"
                    ? "Xem lời giải và Pikafish"
                    : "Phân tích bằng Pikafish"}
              </button>
            </div>
            {analysisOpen && (
              <section className="analysis-panel">
                {mode === "training" && revealed && (
                  <div className="curated-explanation">
                    <strong>Lời giải của bài</strong>
                    <p>{exercise.explanation}</p>
                    <button
                      className="text-button"
                      onClick={() => {
                        setSolutionShown(true);
                        setPreview(null);
                      }}
                    >
                      {describeMove(exercise.fen, exercise.solution)}
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                )}
                {busy && <p className="muted">Đang phân tích…</p>}
                {analysis && (
                  <>
                    <div className="analysis-heading">
                      <strong>Pikafish</strong>
                      <span>Điểm theo bên {sideInAnalysis}</span>
                    </div>
                    {mode === "free" && analysis.rootFen !== inputFen && (
                      <p className="analysis-note">
                        Phân tích thế cờ trước nước bạn vừa đi, để so sánh các
                        lựa chọn lúc đó.
                      </p>
                    )}
                    {!analysis.lines.length ? (
                      <p>Bên tới lượt không còn nước hợp lệ.</p>
                    ) : (
                      analysis.lines.map((line, i) => (
                        <button
                          className="engine-line"
                          key={line.rank}
                          onClick={() => {
                            setSelected(null);
                            setSolutionShown(false);
                            setPreview({ line: i, ply: 0 });
                          }}
                        >
                          <span>
                            <b>{line.rank}.</b>{" "}
                            {describeMove(analysis.rootFen, line.pv[0])}
                            <small>Độ sâu {line.depth} · Xem biến thể</small>
                          </span>
                          <strong>{scoreLabel(line.score)}</strong>
                        </button>
                      ))
                    )}
                    {playedAnalysis?.lines[0] && (
                      <p className="played-score">
                        Nước bạn chọn:{" "}
                        <strong>
                          {scoreLabel(playedAnalysis.lines[0].score)}
                        </strong>{" "}
                        · độ sâu {playedAnalysis.lines[0].depth}
                      </p>
                    )}
                    <p className="analysis-note">
                      Kết quả trong giới hạn tìm kiếm 1,2 giây mỗi lượt. Điểm số
                      không phải xác suất thắng hay điểm trình độ.
                    </p>
                  </>
                )}
              </section>
            )}
            {mode === "training" ? (
              <div className="lesson-footer">
                <span>
                  {alreadyExposed
                    ? "Bài đã thử · kết quả lặp lại được lưu riêng"
                    : "Lần đầu làm bài này"}
                </span>
                <button
                  onClick={() =>
                    chooseExercise((exerciseIndex + 1) % EXERCISES.length)
                  }
                >
                  {exerciseIndex === EXERCISES.length - 1
                    ? "Về bài đầu"
                    : "Bài tiếp"}
                  <ChevronRight size={17} />
                </button>
              </div>
            ) : (
              <div className="free-actions">
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => {
                    resetTurn();
                    setAnalysisOpen(true);
                    void analyzeMove(START_FEN, null, moves);
                  }}
                >
                  <ScanLine size={16} />
                  Phân tích thế hiện tại
                </button>
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => void machineMove()}
                >
                  <Sparkles size={16} />
                  Để máy đi tiếp
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    resetTurn();
                    setMoves([]);
                  }}
                >
                  Bắt đầu ván mới
                </button>
              </div>
            )}
          </aside>
        </div>

        <section className="learning-note">
          <div className="note-icon">
            <Flag size={21} />
          </div>
          <div>
            <h3>
              {mode === "training"
                ? "Tập một thói quen, trước khi học một chiến thuật."
                : "Tự kiểm tra suy nghĩ của mình."}
            </h3>
            <p>
              {mode === "training"
                ? "Trước mỗi nước bắt quân, dừng lại hỏi: “Đối phương có thể bắt lại bằng quân nào?”"
                : "So sánh các nước ứng viên, xem nước đáp, rồi dùng engine kiểm tra. Bản này chưa phân xử đầy đủ trường chiếu và trường tróc."}
            </p>
          </div>
          <span className="note-tag">QUAN SÁT → KIỂM TRA</span>
        </section>
        {storageWarning && (
          <p role="alert" className="inline-message">
            {storageWarning}
          </p>
        )}
      </main>
      <footer className="site-footer">
        <span>
          KỲ LỘ <span className="footer-dot">·</span> Đi chậm để nhìn xa.
        </span>
        <span>Dữ liệu luyện tập lưu trên trình duyệt này.</span>
      </footer>

      <dialog
        ref={dialogRef}
        onCancel={() => setDialog(null)}
        onClose={() => setDialog(null)}
        aria-labelledby="dialog-title"
      >
        <div className="dialog-header">
          <h2 id="dialog-title">
            {dialog === "progress"
              ? "Những lần bạn đã thử"
              : dialog === "openings"
                ? "Sổ tay khai cuộc"
                : "Bắt đầu với bàn cờ"}
          </h2>
          <button
            className="icon-button"
            aria-label="Đóng"
            onClick={() => setDialog(null)}
          >
            <X size={20} />
          </button>
        </div>
        {dialog === "progress" ? (
          <>
            <p>
              Ghi lại cách bạn làm bài. Những con số này chưa đánh giá trình độ
              chơi cờ.
            </p>
            <div className="progress-stats">
              <div>
                <strong>{attempts.length}</strong>
                <span>Lần thử</span>
              </div>
              <div>
                <strong>{independentSuccesses(attempts)}</strong>
                <span>Bài đúng ở lần đầu, không trợ giúp</span>
              </div>
            </div>
            <div className="recommendation-card">
              <div>
                <small>GỢI Ý ÔN TIẾP</small>
                <strong>{recommendation.exercise.title}</strong>
                <p>{recommendation.reason}</p>
              </div>
              <button
                className="compact-button"
                onClick={() => {
                  setDialog(null);
                  chooseExercise(
                    EXERCISES.findIndex(
                      (item) => item.id === recommendation.exercise.id,
                    ),
                  );
                }}
              >
                Ôn bài này <ArrowRight size={15} />
              </button>
            </div>
            <div className="skill-summary" aria-label="Dấu vết kỹ năng">
              {skillSummaries.map((skill) => (
                <div key={skill.id}>
                  <span>{skill.label}</span>
                  <small>
                    {skill.status === "untested"
                      ? "Chưa thử"
                      : skill.status === "independent-evidence"
                        ? `${skill.independentSuccesses} lần đúng độc lập`
                        : "Cần ôn lại không trợ giúp"}
                  </small>
                </div>
              ))}
            </div>
            {attempts.length ? (
              <ol className="attempt-list">
                {attempts
                  .slice(-12)
                  .reverse()
                  .map((a) => (
                    <li key={a.id}>
                      <div>
                        <strong>
                          {EXERCISES.find((e) => e.id === a.exerciseId)?.title}
                        </strong>
                        <small>
                          {a.move.slice(0, 2)} → {a.move.slice(2)} · Lần{" "}
                          {a.ordinal} · {a.hints} gợi ý
                          {a.revealed ? " · Đã mở lời giải" : ""}
                        </small>
                      </div>
                      <span>{a.success ? "Đạt mục tiêu" : "Cần thử lại"}</span>
                    </li>
                  ))}
              </ol>
            ) : (
              <div className="empty-history">
                Hãy thử một nước ở bài đầu. Kết quả sẽ xuất hiện tại đây.
              </div>
            )}
            <p className="muted">
              Gợi ý ôn dựa trên lịch sử cục bộ và mức trợ giúp, không phải điểm
              trình độ. Chưa có lịch nhắc nhớ lại theo ngày hoặc dữ liệu đủ để
              gọi một kỹ năng là đã thành thạo.
            </p>
          </>
        ) : dialog === "openings" ? (
          <>
            <p>
              Khai cuộc là cách đưa quân ra, giữ Tướng và tranh tiên. Hãy học ý
              tưởng trước khi nhớ biến.
            </p>
            <div className="opening-family-list">
              {OPENING_FAMILIES.map((family) => (
                <section className="opening-family" key={family.id}>
                  <div>
                    <small>{family.titleZh}</small>
                    <h3>{family.titleVi}</h3>
                    <p>{family.goal}</p>
                  </div>
                  <strong>Nên làm</strong>
                  <ul>
                    {family.plans.map((plan) => (
                      <li key={plan}>{plan}</li>
                    ))}
                  </ul>
                  <strong>Cẩn thận</strong>
                  <ul>
                    {family.risks.map((risk) => (
                      <li key={risk}>{risk}</li>
                    ))}
                  </ul>
                  <p className="opening-next-step">{family.nextStep}</p>
                  <small className="opening-source">{family.sourceNote}</small>
                </section>
              ))}
            </div>
          </>
        ) : (
          <>
            <p>
              Chọn một quân của bên tới lượt, rồi chọn điểm đến. Các chấm xanh
              là nước hợp lệ. Bạn có thể giữ tối đa 3 nước ứng viên trước khi
              thử.
            </p>
            <p>
              <strong>Bàn phím:</strong> Tab vào bàn cờ, dùng phím mũi tên để di
              chuyển và Enter để chọn. Escape đóng cửa sổ này.
            </p>
            <div className="piece-guide">
              {["k", "a", "b", "n", "r", "c", "p"].map((type) => {
                const piece = { type, color: "r" } as Parameters<
                  typeof pieceName
                >[0];
                return <span key={type}>{pieceName(piece)}</span>;
              })}
            </div>
            <p>
              Tọa độ a–i đi từ trái sang phải, 0–9 từ phía Đỏ lên phía Đen. Khi
              xoay bàn, tọa độ vẫn gắn với đúng vị trí.
            </p>
            <p>
              <strong>Giới hạn bản đầu:</strong> bốn thế cờ nhỏ do dự án biên
              soạn; kiểm tra luật và phân tích engine không thay thế việc chuyên
              gia duyệt giáo trình.
            </p>
            <a href="/engine/LICENSE.txt" target="_blank" rel="noreferrer">
              Giấy phép GPLv3 của Pikafish
            </a>
          </>
        )}
      </dialog>
    </div>
  );
}
