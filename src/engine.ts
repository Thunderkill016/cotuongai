import { position, replay } from "./chess";

export const ENGINE_BUILD = "Pikafish / 00ac398c / NNUE 9e20a9a44415";
export const SEARCH_MS = 1200; // Interactive analysis budget; depth is reported, never guaranteed.
export const ENGINE_INIT_TIMEOUT_MS = 60000; // First load includes the NNUE download.
const SEARCH_TIMEOUT_MS = 20000; // Bounded failure on weak hardware, independent of chess evaluation.
export interface Score {
  kind: "cp" | "mate";
  value: number;
  bound: "exact" | "lower" | "upper";
}
export interface EngineLine {
  rank: number;
  depth: number;
  score: Score;
  pv: string[];
  nodes: number;
  time: number;
}
export interface Analysis {
  id: number;
  fen: string;
  history: string[];
  rootFen: string;
  bestmove: string | null;
  lines: EngineLine[];
  build: string;
  budget: number;
}

export function parseInfo(raw: string): EngineLine | null {
  if (!raw.startsWith("info ") || raw.startsWith("info string ")) return null;
  const t = raw.trim().split(/\s+/);
  const number = (key: string, fallback = 0) =>
    t.includes(key) ? Number(t[t.indexOf(key) + 1]) : fallback;
  const scoreAt = t.indexOf("score");
  const pvAt = t.indexOf("pv");
  const kind = t[scoreAt + 1];
  const value = Number(t[scoreAt + 2]);
  const depth = number("depth");
  const rank = number("multipv", 1);
  if (
    scoreAt < 0 ||
    pvAt < 0 ||
    !["cp", "mate"].includes(kind) ||
    !Number.isInteger(value) ||
    !Number.isInteger(depth) ||
    depth < 1 ||
    !Number.isInteger(rank) ||
    rank < 1
  )
    return null;
  const pv = t.slice(pvAt + 1);
  if (!pv.length || pv.some((m) => !/^[a-i][0-9][a-i][0-9]$/.test(m)))
    return null;
  return {
    rank,
    depth,
    score: {
      kind: kind as Score["kind"],
      value,
      bound: t.includes("lowerbound")
        ? "lower"
        : t.includes("upperbound")
          ? "upper"
          : "exact",
    },
    pv,
    nodes: number("nodes"),
    time: number("time"),
  };
}

export function selectLines(
  lines: EngineLine[],
  rootFen: string,
  count: number,
): EngineLine[] {
  const depths = [...new Set(lines.map((l) => l.depth))].sort((a, b) => b - a);
  for (const depth of depths) {
    const atDepth = new Map<number, EngineLine>();
    for (const line of lines.filter((l) => l.depth === depth)) {
      try {
        replay(rootFen, line.pv);
        atDepth.set(line.rank, line);
      } catch {
        /* Illegal PV cannot become coaching evidence. */
      }
    }
    const complete = [...atDepth.values()]
      .filter((l) => l.rank <= count)
      .sort((a, b) => a.rank - b.rank);
    if (
      Array.from({ length: count }, (_, i) => i + 1).every((rank) =>
        atDepth.has(rank),
      ) &&
      new Set(complete.map((l) => l.pv[0])).size === count
    )
      return complete;
  }
  return [];
}

export function scoreLabel(score: Score): string {
  if (score.kind === "mate")
    return score.value > 0
      ? `Báo chiếu bí ${score.value}`
      : `Báo bị chiếu bí ${Math.abs(score.value)}`;
  const prefix =
    score.bound === "lower" ? "≥ " : score.bound === "upper" ? "≤ " : "";
  return `${prefix}${score.value > 0 ? "+" : ""}${(score.value / 100).toFixed(2)}`;
}

type Pending = {
  id: number;
  fen: string;
  history: string[];
  rootFen: string;
  count: number;
  requireCoherentLine: boolean;
  searchmove?: string;
  lines: EngineLine[];
  resolve: (a: Analysis) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};
export class EngineClient {
  private worker: Worker | null = null;
  private pending: Pending | null = null;
  private sequence = 0;
  private initialized: Promise<void> | null = null;
  private initReject: ((e: Error) => void) | null = null;
  private initTimer: ReturnType<typeof setTimeout> | null = null;
  constructor(
    private status: (
      value: "loading" | "ready" | "error",
      message?: string,
    ) => void = () => {},
  ) {}

  init(): Promise<void> {
    if (this.initialized) return this.initialized;
    if (
      !globalThis.crossOriginIsolated ||
      typeof SharedArrayBuffer === "undefined"
    ) {
      const error = new Error(
        "Trình duyệt chưa hỗ trợ chế độ phân tích này. Bạn vẫn có thể làm bài và xem gợi ý.",
      );
      this.status("error", error.message);
      return Promise.reject(error);
    }
    this.status("loading");
    try {
      this.worker = new Worker("/engine/pikafish-engine.js");
    } catch {
      const error = new Error(
        "Trình duyệt không cho phép khởi động Worker. Bạn vẫn có thể làm bài.",
      );
      this.status("error", error.message);
      return Promise.reject(error);
    }
    const worker = this.worker;
    this.initialized = new Promise<void>((resolve, reject) => {
      this.initReject = reject;
      this.initTimer = setTimeout(
        () =>
          this.fail(new Error("Nạp Pikafish quá lâu. Hãy thử nạp lại engine.")),
        ENGINE_INIT_TIMEOUT_MS,
      );
      worker.onerror = () =>
        this.fail(
          new Error("Không thể khởi động Pikafish. Hãy nạp lại engine."),
        );
      worker.onmessage = (event) => {
        if (this.worker !== worker) return;
        const data = event.data;
        if (data.type === "READY") {
          if (this.initTimer) clearTimeout(this.initTimer);
          this.initReject = null;
          this.status("ready");
          resolve();
        } else if (data.type === "ERROR") this.fail(new Error(data.message));
        else if (data.type === "LINE")
          this.onLine(data.id, data.line, data.cancelled);
      };
    });
    return this.initialized;
  }

  async analyze(
    fen: string,
    history: string[] = [],
    searchmove?: string,
    requireCoherentLine = true,
  ): Promise<Analysis> {
    this.cancel();
    const id = ++this.sequence;
    const game = position(fen, history);
    if (game.in_threefold_repetition())
      throw new Error(
        "Thế cờ lặp lại: bản này chưa phân xử luật trường chiếu/trường tróc. Hãy quay lại hoặc bắt đầu ván mới.",
      );
    const rootFen = game.fen();
    const legal = game.moves();
    if (searchmove && !legal.includes(searchmove))
      throw new Error("Nước ứng viên không hợp lệ.");
    if (!legal.length)
      return {
        id,
        fen,
        history,
        rootFen,
        bestmove: null,
        lines: [],
        build: ENGINE_BUILD,
        budget: SEARCH_MS,
      };
    await this.init();
    if (id !== this.sequence)
      throw new DOMException("Đã đổi thế cờ.", "AbortError");
    // Playing one legal reply must not depend on receiving a complete MultiPV
    // bundle. The stricter path stays mandatory for coaching and review.
    const count = requireCoherentLine
      ? searchmove
        ? 1
        : Math.min(3, legal.length)
      : 1;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () =>
          this.fail(
            new Error("Phân tích quá lâu. Bạn có thể thử nạp lại engine."),
          ),
        SEARCH_TIMEOUT_MS,
      );
      this.pending = {
        id,
        fen,
        history: [...history],
        rootFen,
        count,
        requireCoherentLine,
        searchmove,
        lines: [],
        resolve,
        reject,
        timer,
      };
      this.worker!.postMessage({
        type: "ANALYZE",
        id,
        fen: fen.replace(/ r /, " w "),
        moves: history,
        searchmove,
        multipv: count,
        movetime: SEARCH_MS,
      });
    });
  }

  playMove(fen: string, history: string[] = []): Promise<Analysis> {
    return this.analyze(fen, history, undefined, false);
  }

  private onLine(id: number, raw: string, cancelled: boolean) {
    const job = this.pending;
    if (!job || job.id !== id || cancelled) return;
    const line = parseInfo(raw);
    if (line) job.lines.push(line);
    if (!raw.startsWith("bestmove ")) return;
    clearTimeout(job.timer);
    this.pending = null;
    const bestmove = raw.split(/\s+/)[1];
    const lines = selectLines(job.lines, job.rootFen, job.count);
    if (
      !position(job.rootFen).moves().includes(bestmove) ||
      (job.searchmove && bestmove !== job.searchmove) ||
      (job.requireCoherentLine &&
        (!lines.length || lines[0].pv[0] !== bestmove))
    ) {
      job.reject(
        new Error(
          "Chưa có biến thể đồng nhất và hợp lệ. Hãy phân tích lại; kết quả này không được dùng để giải thích.",
        ),
      );
      return;
    }
    job.resolve({
      id,
      fen: job.fen,
      history: job.history,
      rootFen: job.rootFen,
      bestmove,
      lines,
      build: ENGINE_BUILD,
      budget: SEARCH_MS,
    });
  }

  cancel() {
    ++this.sequence;
    if (this.pending) {
      const pending = this.pending;
      this.pending = null;
      clearTimeout(pending.timer);
      this.worker?.postMessage({ type: "CANCEL", id: pending.id });
      pending.reject(new DOMException("Đã đổi thế cờ.", "AbortError"));
    }
  }

  private fail(error: Error) {
    if (this.initTimer) clearTimeout(this.initTimer);
    this.initReject?.(error);
    this.initReject = null;
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(error);
      this.pending = null;
    }
    this.worker?.terminate();
    this.worker = null;
    this.initialized = null;
    this.status("error", error.message);
  }

  dispose() {
    this.cancel();
    if (this.initTimer) clearTimeout(this.initTimer);
    this.initReject?.(new DOMException("Đã đóng engine.", "AbortError"));
    this.initReject = null;
    this.worker?.terminate();
    this.worker = null;
    this.initialized = null;
  }
}
