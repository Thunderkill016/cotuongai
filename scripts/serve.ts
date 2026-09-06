import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { createServer as createViteServer } from "vite";
import { coachChoices } from "../src/training";
import { selectCoachChoice, validateCoachRequest } from "../src/coach";

const port = Number(process.env.PORT || 4180);
const production = process.argv.includes("--production");
const vite = production
  ? null
  : await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
const directory = resolve("dist");
const MODEL_TIMEOUT_MS = 20000;
const MAX_BODY_BYTES = 16000;
const MAX_REQUESTS_PER_MINUTE = 8;
let requestTimes: number[] = [];
let coachBusy = false;

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

async function coach(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST")
    return json(res, 405, { error: "Method not allowed" });
  const origin = req.headers.origin;
  if (origin && origin !== `http://${req.headers.host}`)
    return json(res, 403, { error: "Origin rejected" });
  if (!req.headers["content-type"]?.startsWith("application/json"))
    return json(res, 415, { error: "Expected JSON" });
  let body = "";
  try {
    for await (const chunk of req) {
      body += chunk.toString();
      if (Buffer.byteLength(body) > MAX_BODY_BYTES)
        return json(res, 413, { error: "Request too large" });
    }
    const request = validateCoachRequest(JSON.parse(body));
    const choices = coachChoices(request.fen, request.move);
    const fallback = () =>
      json(res, 200, { choiceId: choices[0].id, source: "curated" });
    const key = process.env.EXPLABS_API_KEY;
    if (!key) return fallback();
    requestTimes = requestTimes.filter((t) => Date.now() - t < 60000);
    if (coachBusy || requestTimes.length >= MAX_REQUESTS_PER_MINUTE)
      return fallback();
    requestTimes.push(Date.now());
    coachBusy = true;
    try {
      const response = await fetch(
        `${(process.env.COACH_BASE_URL || "https://api.experientiallabs.ai/v1").replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
          body: JSON.stringify({
            model: process.env.COACH_MODEL || "gpt-6-astra",
            reasoning_effort: "low",
            max_tokens: 512,
            messages: [
              {
                role: "system",
                content:
                  'You select the most useful Socratic question for a beginner Xiangqi learner. The input contains bounded engine analysis, not absolute chess truth. Choose ONLY one of the supplied choice IDs. Output JSON with exactly one property: {"choiceId":"..."}. Do not invent a move, claim, score or explanation.',
              },
              {
                role: "user",
                content: JSON.stringify({ ...request, choices }),
              },
            ],
          }),
        },
      );
      if (!response.ok) {
        console.warn(
          `Coach upstream HTTP ${response.status}; using curated question.`,
        );
        return fallback();
      }
      const result = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const selected = selectCoachChoice(
        result.choices?.[0]?.message?.content || "",
        choices,
      );
      return json(res, 200, { choiceId: selected.id, source: "ai" });
    } catch {
      console.warn(
        "Coach unavailable or invalid selection; using curated question.",
      );
      return fallback();
    } finally {
      coachBusy = false;
    }
  } catch {
    return json(res, 400, {
      error: "Invalid position, move, or analysis evidence",
    });
  }
}

const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".wasm": "application/wasm",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
};
const server = createServer(async (req, res) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const host = req.headers.host?.split(":")[0];
  if (!["localhost", "127.0.0.1"].includes(host || ""))
    return json(res, 403, { error: "Local server only" });
  if (req.url === "/api/coach") return coach(req, res);
  if (req.url === "/api/status")
    return json(res, 200, { coach: !!process.env.EXPLABS_API_KEY });
  if (vite) return vite.middlewares(req, res);
  if (req.method !== "GET" && req.method !== "HEAD")
    return json(res, 405, { error: "Method not allowed" });
  try {
    const pathname = decodeURIComponent(
      new URL(req.url || "/", "http://localhost").pathname,
    );
    let file = resolve(directory, "." + pathname);
    if (!file.startsWith(directory + sep) && file !== directory)
      return json(res, 403, { error: "Forbidden" });
    if (file === directory) file = resolve(directory, "index.html");
    await stat(file);
    res.setHeader(
      "Content-Type",
      mime[extname(file)] || "application/octet-stream",
    );
    res.end(req.method === "HEAD" ? undefined : await readFile(file));
  } catch {
    json(res, 404, { error: "Not found" });
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Kỳ Lộ: http://localhost:${port} (${production ? "production build" : "development"}; coach ${process.env.EXPLABS_API_KEY ? "configured" : "curated"})`,
  ),
);
