import { coachChoices, type CoachChoice } from "./training";
import { position, replay } from "./chess";

export interface CoachRequest {
  fen: string;
  move: string;
  evidence: {
    bestmove: string;
    pv: string[];
    depth: number;
    score: { kind: "cp" | "mate"; value: number };
  };
}
export function validateCoachRequest(body: unknown): CoachRequest {
  if (!body || typeof body !== "object") throw new Error("Invalid request");
  const data = body as CoachRequest;
  const game = position(data.fen);
  if (typeof data.move !== "string" || !game.move(data.move))
    throw new Error("Invalid move");
  const e = data.evidence;
  if (
    !e ||
    !Array.isArray(e.pv) ||
    !e.pv.length ||
    e.pv.length > 100 ||
    e.pv[0] !== e.bestmove ||
    !Number.isInteger(e.depth) ||
    e.depth < 1 ||
    !e.score ||
    !["cp", "mate"].includes(e.score.kind) ||
    !Number.isInteger(e.score.value)
  )
    throw new Error("Invalid evidence");
  replay(data.fen, e.pv);
  return {
    fen: data.fen,
    move: data.move,
    evidence: {
      bestmove: e.bestmove,
      pv: e.pv,
      depth: e.depth,
      score: { kind: e.score.kind, value: e.score.value },
    },
  };
}

export function selectCoachChoice(
  content: string,
  choices: CoachChoice[],
): CoachChoice {
  const parsed: unknown = JSON.parse(content);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    Object.keys(parsed).length !== 1 ||
    !("choiceId" in parsed)
  )
    throw new Error("Invalid coach selection");
  const choice = choices.find((c) => c.id === parsed.choiceId);
  if (!choice) throw new Error("Unknown coach selection");
  return choice;
}

export async function requestCoaching(
  request: CoachRequest,
  signal: AbortSignal,
): Promise<{ text: string; source: "ai" | "curated" }> {
  const fallback = coachChoices(request.fen, request.move)[0];
  try {
    const response = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
    if (!response.ok) return { text: fallback.text, source: "curated" };
    const body = await response.json();
    const allowed = coachChoices(request.fen, request.move).find(
      (c) => c.id === body.choiceId,
    );
    if (!allowed) return { text: fallback.text, source: "curated" };
    return {
      text: allowed.text,
      source: body.source === "ai" ? "ai" : "curated",
    };
  } catch (error) {
    if (signal.aborted) throw error;
    return { text: fallback.text, source: "curated" };
  }
}
