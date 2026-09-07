import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import {
  EngineClient,
  ENGINE_INIT_TIMEOUT_MS,
  type Analysis,
} from "../src/engine";
import { START_FEN, replay } from "../src/chess";

class TestWorker {
  static instances: TestWorker[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  messages: Record<string, unknown>[] = [];
  terminated = false;
  constructor() {
    TestWorker.instances.push(this);
  }
  postMessage(message: Record<string, unknown>) {
    this.messages.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  emit(data: unknown) {
    this.onmessage?.({ data });
  }
  finish(id: unknown, moves = ["h2e2", "b2e2", "h0g2"]) {
    moves.forEach((move, i) =>
      this.emit({
        type: "LINE",
        id,
        line: `info depth 5 multipv ${i + 1} score cp ${20 - i} nodes 400 time 40 pv ${move}`,
      }),
    );
    this.emit({ type: "LINE", id, line: `bestmove ${moves[0]}` });
  }
}

describe("engine request lifecycle with a simulated transport", () => {
  let client: EngineClient;
  beforeEach(() => {
    TestWorker.instances = [];
    vi.stubGlobal("Worker", TestWorker);
    vi.stubGlobal("crossOriginIsolated", true);
    client = new EngineClient();
  });
  afterEach(() => {
    client.dispose();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  async function initialize() {
    const ready = client.init();
    const worker = TestWorker.instances.at(-1)!;
    worker.emit({ type: "READY" });
    await ready;
    return worker;
  }
  it("rejects unavailable isolation without creating a worker", async () => {
    vi.stubGlobal("crossOriginIsolated", false);
    await expect(client.init()).rejects.toThrow("Trình duyệt");
    expect(TestWorker.instances).toHaveLength(0);
  });
  it("can recover after Worker construction is blocked", async () => {
    vi.stubGlobal(
      "Worker",
      class {
        constructor() {
          throw new Error("Blocked");
        }
      },
    );
    await expect(client.init()).rejects.toThrow("không cho phép");
    vi.stubGlobal("Worker", TestWorker);
    await initialize();
  });
  it("cancels an old search and ignores its later result, even at the same FEN", async () => {
    const worker = await initialize();
    const old = client.analyze(START_FEN).catch((e) => e as Error);
    await Promise.resolve();
    const oldId = worker.messages.at(-1)!.id;
    const current = client.analyze(START_FEN);
    await Promise.resolve();
    const newId = worker.messages.at(-1)!.id;
    expect(((await old) as Error).name).toBe("AbortError");
    expect(newId).not.toBe(oldId);
    worker.finish(oldId);
    worker.finish(newId);
    expect((await current).id).toBe(newId);
  });
  it("retains the complete history and validates PV at the resulting side to move", async () => {
    const worker = await initialize();
    const result = client.analyze(START_FEN, ["h2e2"]);
    await Promise.resolve();
    const request = worker.messages.at(-1)!;
    expect(request.fen).toContain(" w ");
    expect(request.moves).toEqual(["h2e2"]);
    worker.finish(request.id, ["h9g7", "b9c7", "h7e7"]);
    expect((await result).rootFen).toBe(replay(START_FEN, ["h2e2"]));
  });
  it("rejects an engine response that ignored searchmoves", async () => {
    const worker = await initialize();
    const result = client.analyze(START_FEN, [], "h2e2");
    await Promise.resolve();
    worker.finish(worker.messages.at(-1)!.id, ["b2e2"]);
    await expect(result).rejects.toThrow("Chưa có biến thể");
  });
  it("fails closed on illegal PV and preserves no fabricated analysis", async () => {
    const worker = await initialize();
    const result = client.analyze(START_FEN);
    await Promise.resolve();
    worker.finish(worker.messages.at(-1)!.id, ["a0a9", "b2e2", "h0g2"]);
    await expect(result).rejects.toThrow("Chưa có biến thể");
  });
  it("plays a legal engine reply even when the optional MultiPV bundle is incomplete", async () => {
    const worker = await initialize();
    const result = client.playMove(START_FEN, ["h2e2"]);
    await Promise.resolve();
    const request = worker.messages.at(-1)!;
    expect(request.multipv).toBe(1);
    worker.emit({ type: "LINE", id: request.id, line: "bestmove h9g7" });
    await expect(result).resolves.toMatchObject({
      bestmove: "h9g7",
      lines: [],
    });
  });
  it("still rejects an illegal engine reply in play mode", async () => {
    const worker = await initialize();
    const result = client.playMove(START_FEN);
    await Promise.resolve();
    worker.emit({
      type: "LINE",
      id: worker.messages.at(-1)!.id,
      line: "bestmove a0a9",
    });
    await expect(result).rejects.toThrow("Chưa có biến thể");
  });
  it("times out failed initialization and terminates the worker", async () => {
    vi.useFakeTimers();
    const ready = client.init();
    const rejected = expect(ready).rejects.toThrow("quá lâu");
    await vi.advanceTimersByTimeAsync(ENGINE_INIT_TIMEOUT_MS);
    await rejected;
    expect(TestWorker.instances[0].terminated).toBe(true);
    await initialize();
  });
  it("cancellation while NNUE loads prevents a search from starting", async () => {
    const result = client.analyze(START_FEN).catch((e) => e as Error);
    client.cancel();
    const worker = TestWorker.instances.at(-1)!;
    worker.emit({ type: "READY" });
    expect(((await result) as Error).name).toBe("AbortError");
    expect(worker.messages).toHaveLength(0);
  });
  it("worker failure rejects the active search and permits explicit reload", async () => {
    const worker = await initialize();
    const result = client.analyze(START_FEN);
    await Promise.resolve();
    worker.onerror?.();
    await expect(result).rejects.toThrow("khởi động");
    expect(worker.terminated).toBe(true);
    await initialize();
  });
});

describe("actual bridge source with a simulated C++ boundary", () => {
  function bridge() {
    const commands: string[] = [];
    const messages: Record<string, unknown>[] = [];
    const deferred: (() => void)[] = [];
    let listener: (event: { data: unknown }) => void = () => {};
    const module = {
      ccall: (
        _name: string,
        _type: string,
        _args: string[],
        values: string[],
      ) => {
        commands.push(values[0]);
      },
      print: (_line: string) => {},
    };
    runInNewContext(
      readFileSync(
        new URL("../scripts/engine-bridge.js", import.meta.url),
        "utf8",
      ),
      {
        ENVIRONMENT_IS_PTHREAD: false,
        Module: module,
        console,
        self: {
          postMessage: (message: Record<string, unknown>) =>
            messages.push(message),
          addEventListener: (_type: string, fn: typeof listener) => {
            listener = fn;
          },
        },
        setTimeout: (fn: () => void) => deferred.push(fn),
      },
    );
    const flush = () => {
      while (deferred.length) deferred.shift()!();
    };
    const send = (id: number) =>
      listener({
        data: {
          type: "ANALYZE",
          id,
          fen: START_FEN,
          moves: [],
          multipv: 3,
          movetime: 1200,
        },
      });
    return { module, commands, messages, flush, send };
  }
  it("never re-enters C++ while its output callback still holds sync_cout", () => {
    const runtime = bridge();
    runtime.module.print("uciok");
    expect(runtime.commands).toEqual([]);
    runtime.flush();
    expect(runtime.commands).toContain("isready");
    expect(runtime.commands).toContain("setoption name Hash value 32");
  });
  it("waits for cancelled bestmove before sending the next position", () => {
    const r = bridge();
    r.module.print("readyok");
    r.flush();
    r.send(1);
    r.send(2);
    expect(r.commands.filter((c) => c.startsWith("position "))).toHaveLength(1);
    expect(r.commands.at(-1)).toBe("stop");
    r.module.print("bestmove h2e2");
    r.flush();
    expect(r.messages.at(-1)).toMatchObject({ id: 1, cancelled: true });
    expect(r.commands.filter((c) => c.startsWith("position "))).toHaveLength(2);
    r.module.print("bestmove b2e2");
    r.flush();
    expect(r.messages.at(-1)).toMatchObject({ id: 2, cancelled: false });
  });
});
