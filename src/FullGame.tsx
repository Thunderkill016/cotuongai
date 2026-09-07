import { useEffect, useMemo, useRef, useState } from "react";
import { Board } from "./Board";
import { describeMove, position, START_FEN, type Side } from "./chess";
import { EngineClient } from "./engine";
import {
  canUndoGame,
  createGame,
  describeGameStatus,
  GAME_STORAGE_KEY,
  gameOutcome,
  parseLocalGame,
  playGameMove,
  resignGame,
  undoGame,
  type GameMode,
  type LocalGame,
} from "./game";

export function FullGame({ onPractice }: { onPractice: () => void }) {
  const [saved, setSaved] = useState<LocalGame | null>(() => {
    try {
      return parseLocalGame(localStorage.getItem(GAME_STORAGE_KEY));
    } catch {
      return null;
    }
  });
  const [humanSide, setHumanSide] = useState<Side>(saved?.humanSide ?? "r");
  const [mode, setMode] = useState<GameMode>(saved?.mode ?? "practice");
  const [started, setStarted] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [ply, setPly] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(saved?.humanSide === "b");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const [retry, setRetry] = useState(0);
  const engine = useRef<EngineClient | null>(null);
  const game = saved ?? createGame(humanSide, mode);
  const board = useMemo(
    () => position(START_FEN, game.moves.slice(0, ply ?? game.moves.length)),
    [game.moves, ply],
  );
  const outcome = useMemo(() => gameOutcome(game), [game]);
  const reviewing = ply !== null;
  const canPlay =
    started &&
    !reviewing &&
    outcome.kind === "active" &&
    board.turn() === game.humanSide &&
    !busy;
  const destinations =
    canPlay && selected
      ? board.moves({ square: selected }).map((move) => move.slice(2))
      : [];
  const history = useMemo(() => {
    const current = position();
    return game.moves.map((move) => {
      const label = describeMove(current.fen(), move);
      current.move(move);
      return label;
    });
  }, [game.moves]);

  useEffect(() => {
    const client = new EngineClient();
    engine.current = client;
    return () => client.dispose();
  }, []);

  useEffect(() => {
    if (!saved) return;
    try {
      localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(saved));
    } catch {
      setStorageWarning(
        "Không lưu được ván trên trình duyệt. Hãy giữ trang này mở để chơi tiếp.",
      );
    }
  }, [saved]);

  useEffect(() => {
    if (
      !started ||
      !saved ||
      reviewing ||
      gameOutcome(saved).kind !== "active" ||
      position(START_FEN, saved.moves).turn() === saved.humanSide
    )
      return;
    let stale = false;
    const client = engine.current!;
    setBusy(true);
    setError("");
    client
      .analyze(START_FEN, saved.moves)
      .then((result) => {
        if (stale) return;
        if (!result.bestmove)
          throw new Error("Pikafish chưa trả về nước đi. Hãy thử lại.");
        const next = playGameMove(saved, result.bestmove, "engine");
        setSaved((current) => (current === saved ? next : current));
      })
      .catch((reason: Error) => {
        if (!stale && reason.name !== "AbortError") setError(reason.message);
      })
      .finally(() => {
        if (!stale) setBusy(false);
      });
    return () => {
      stale = true;
      client.cancel();
      setBusy(false);
    };
  }, [saved, started, reviewing, retry]);

  function begin() {
    engine.current?.cancel();
    setSaved(createGame(humanSide, mode));
    setStarted(true);
    setPly(null);
    setSelected(null);
    setFlipped(humanSide === "b");
    setError("");
  }
  function clickSquare(square: string) {
    if (!canPlay) return;
    if (board.get(square)?.color === game.humanSide) {
      setSelected(selected === square ? null : square);
      setError("");
      return;
    }
    if (!selected) {
      setError("Chọn quân của bạn trước, rồi bấm ô muốn đi.");
      return;
    }
    try {
      setSaved(playGameMove(game, selected + square, "human"));
      setSelected(null);
      setError("");
    } catch (reason) {
      setError((reason as Error).message + " Chọn một ô được đánh dấu.");
    }
  }
  function navigate(next: number | null) {
    engine.current?.cancel();
    setSelected(null);
    setPly(next);
    setError("");
  }
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-seal">馬</span>
          <span>
            Kỳ Lộ<span className="brand-sub">CHƠI CỜ · HIỂU NƯỚC ĐI</span>
          </span>
        </a>
        <nav className="main-nav" aria-label="Chế độ">
          <button className="active" aria-current="page">
            Chơi với máy
          </button>
          <button onClick={onPractice}>Luyện tập / Bàn tự do</button>
        </nav>
      </header>
      <main>
        <section className="page-heading">
          <div>
            <div className="eyebrow">MỘT VÁN CỜ TRỌN VẸN</div>
            <h1>Ngồi vào bàn, tính từng nước.</h1>
            <p>Bạn đi quân. Pikafish cầm bên còn lại.</p>
          </div>
        </section>
        <div className="workspace">
          <section className="board-section" aria-label="Ván cờ với Pikafish">
            <div className="board-topline">
              <strong>
                {reviewing
                  ? `Xem lại · nước ${ply}/${game.moves.length}`
                  : `Bạn cầm ${game.humanSide === "r" ? "Đỏ" : "Đen"}`}
              </strong>
              <button onClick={() => setFlipped((value) => !value)}>
                Xoay bàn
              </button>
            </div>
            <Board
              fen={board.fen()}
              selected={selected}
              destinations={destinations}
              lastMove={game.moves[(ply ?? game.moves.length) - 1]}
              onSquare={clickSquare}
              disabled={!canPlay}
              flipped={flipped}
            />
            <p className="inline-message" role="status">
              {started
                ? describeGameStatus(game)
                : "Chọn bên và bắt đầu ván mới, hoặc mở lại ván đã lưu."}
            </p>
            {busy && (
              <p role="status">
                Pikafish đang tính… Lần đầu cần nạp dữ liệu engine.
              </p>
            )}
            {error && (
              <div className="inline-message" role="alert">
                {error}
                {!canPlay &&
                  started &&
                  outcome.kind === "active" &&
                  !reviewing && (
                    <button onClick={() => setRetry((value) => value + 1)}>
                      Thử lại nước máy
                    </button>
                  )}
              </div>
            )}
            {storageWarning && <p role="alert">{storageWarning}</p>}
          </section>
          <aside
            className="coach-panel game-panel"
            aria-label="Điều khiển ván đấu"
          >
            {!started ? (
              <>
                <h2>Vào ván</h2>
                <fieldset>
                  <legend>Bạn cầm bên nào?</legend>
                  <label>
                    <input
                      type="radio"
                      name="side"
                      checked={humanSide === "r"}
                      onChange={() => setHumanSide("r")}
                    />{" "}
                    Đỏ · đi trước
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="side"
                      checked={humanSide === "b"}
                      onChange={() => setHumanSide("b")}
                    />{" "}
                    Đen · đi sau
                  </label>
                </fieldset>
                <fieldset>
                  <legend>Cách chơi</legend>
                  <label>
                    <input
                      type="radio"
                      name="game-mode"
                      checked={mode === "practice"}
                      onChange={() => setMode("practice")}
                    />{" "}
                    Ván luyện · được xin đi lại
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="game-mode"
                      checked={mode === "challenge"}
                      onChange={() => setMode("challenge")}
                    />{" "}
                    Tự thử sức · không đi lại
                  </label>
                </fieldset>
                <button className="primary-button" onClick={begin}>
                  Bắt đầu ván mới
                </button>
                {saved && (
                  <button
                    onClick={() => {
                      setStarted(true);
                      setPly(null);
                    }}
                  >
                    Mở ván đã lưu · {saved.moves.length} nước
                  </button>
                )}
              </>
            ) : (
              <>
                <h2>
                  {outcome.kind === "active" ? "Ván đang chơi" : "Ván đã dừng"}
                </h2>
                <p>
                  {game.mode === "practice"
                    ? "Ván luyện: có thể lùi về trước nước bạn vừa đi."
                    : "Tự thử sức: giữ nguyên các nước đã đi."}
                </p>
                <div className="game-actions">
                  <button
                    disabled={!canUndoGame(game) || reviewing}
                    onClick={() => {
                      engine.current?.cancel();
                      setSaved(undoGame(game));
                      setSelected(null);
                      setError("");
                    }}
                  >
                    Xin đi lại
                  </button>
                  <button
                    disabled={outcome.kind !== "active"}
                    onClick={() => {
                      engine.current?.cancel();
                      setSaved(resignGame(game));
                      setSelected(null);
                      setPly(null);
                    }}
                  >
                    Xin thua
                  </button>
                  <button
                    onClick={() => {
                      engine.current?.cancel();
                      setStarted(false);
                      setPly(null);
                      setSelected(null);
                    }}
                  >
                    Chọn ván mới
                  </button>
                </div>
                <h3>Các nước đã đi</h3>
                <div className="replay-controls">
                  <button
                    aria-label="Về đầu ván"
                    disabled={!game.moves.length}
                    onClick={() => navigate(0)}
                  >
                    Đầu ván
                  </button>
                  <button
                    aria-label="Nước trước"
                    disabled={(ply ?? game.moves.length) === 0}
                    onClick={() => navigate((ply ?? game.moves.length) - 1)}
                  >
                    ←
                  </button>
                  <span>
                    {ply ?? game.moves.length}/{game.moves.length}
                  </span>
                  <button
                    aria-label="Nước tiếp"
                    disabled={(ply ?? game.moves.length) >= game.moves.length}
                    onClick={() => navigate((ply ?? 0) + 1)}
                  >
                    →
                  </button>
                </div>
                {reviewing && (
                  <button
                    className="primary-button"
                    onClick={() => navigate(null)}
                  >
                    Về ván hiện tại
                  </button>
                )}
                <ol className="game-history">
                  {history.map((label, index) => (
                    <li key={index}>
                      <button
                        aria-current={ply === index + 1 ? "step" : undefined}
                        onClick={() => navigate(index + 1)}
                      >
                        {index % 2 === 0 ? "Đỏ" : "Đen"}: {label}
                      </button>
                    </li>
                  ))}
                </ol>
                {!history.length && <p>Chưa có nước đi. Đỏ đi trước.</p>}
              </>
            )}
            <p className="game-rules-note">
              Chiếu bí hoặc hết nước hợp lệ là thua. Khi lặp thế, ván tạm dừng
              để tránh phân xử sai luật trường chiếu/trường tróc. Bản này chưa
              tự phân xử các trường hợp hòa theo luật thi đấu.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}
