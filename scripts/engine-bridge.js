/* GPL-3.0-only. Inserted reproducibly into the upstream Emscripten glue.
 * The WASM binary is unchanged. Raw UCI is normalized and verified by src/engine.ts.
 */
(function () {
  if (ENVIRONMENT_IS_PTHREAD) return;
  var current = null;
  var pending = null;
  var ready = false;
  Module.noInitialRun = true;
  Module.onAbort = function () {
    self.postMessage({ type: "ERROR", message: "Pikafish dừng bất thường." });
  };
  function send(command) {
    Module.ccall("uci_command", "number", ["string"], [command]);
  }
  function startPending() {
    if (!ready || current || !pending) return;
    current = pending;
    pending = null;
    send("ucinewgame");
    send("setoption name MultiPV value " + current.multipv);
    send(
      "position fen " +
        current.fen +
        (current.moves.length ? " moves " + current.moves.join(" ") : ""),
    );
    send(
      "go movetime " +
        current.movetime +
        (current.searchmove ? " searchmoves " + current.searchmove : ""),
    );
  }
  function handleLine(line) {
    line = String(line).trim();
    if (line.includes("ERROR")) {
      self.postMessage({
        type: "ERROR",
        message: "Không thể nạp dữ liệu Pikafish.",
      });
    } else if (line === "uciok") {
      send("setoption name EvalFile value /pikafish-9e20a9a44415.nnue");
      // Two search threads and 32 MiB hash leave room for UI on ordinary laptops.
      send("setoption name Threads value 2");
      send("setoption name Hash value 32");
      send("isready");
    } else if (line === "readyok") {
      ready = true;
      self.postMessage({ type: "READY" });
      startPending();
    } else if (
      current &&
      (line.startsWith("info ") || line.startsWith("bestmove "))
    ) {
      self.postMessage({
        type: "LINE",
        id: current.id,
        line: line,
        cancelled: !!current.cancelled,
      });
      if (line.startsWith("bestmove ")) {
        current = null;
        setTimeout(startPending, 0);
      }
    }
  }
  Module.print = function (line) {
    // UCI writes under sync_cout's mutex. Sending a command from inside print
    // can re-enter that lock and deadlock; handle output after C++ returns.
    setTimeout(function () {
      handleLine(line);
    }, 0);
  };
  Module.printErr = function (line) {
    console.warn("[Pikafish]", String(line));
  };
  self.addEventListener("message", function (event) {
    var data = event.data;
    if (data.type === "ANALYZE") {
      pending = data;
      if (current) {
        current.cancelled = true;
        send("stop");
      } else startPending();
    } else if (data.type === "CANCEL") {
      if (pending && pending.id === data.id) pending = null;
      if (current && current.id === data.id) {
        current.cancelled = true;
        send("stop");
      }
    }
  });
  Module.postRun = function () {
    fetch(new URL("./pikafish-9e20a9a44415.nnue", self.location.href))
      .then(function (res) {
        if (!res.ok) throw new Error("NNUE HTTP " + res.status);
        return res.arrayBuffer();
      })
      .then(function (buffer) {
        Module.FS.writeFile(
          "/pikafish-9e20a9a44415.nnue",
          new Uint8Array(buffer),
        );
        Module.ccall("init_pikafish", "number", [], []);
        send("uci");
      })
      .catch(function () {
        self.postMessage({
          type: "ERROR",
          message:
            "Không tải được NNUE. Hãy kiểm tra kết nối rồi nạp lại engine.",
        });
      });
  };
})();
