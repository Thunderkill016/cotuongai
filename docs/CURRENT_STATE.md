# Current state — 2026-09-06

## What is implemented

- React 19 + TypeScript + Vite application.
- Deterministic Xiangqi position/rules wrapper with FEN validation.
- Keyboard/touch 2D board and board flip.
- Four hand-authored training fixtures for one-step capture/recapture observation.
- Candidate moves, progressive hints, answer reveal, attempt history and exposure tracking.
- Free-board mode with move history and undo.
- Pikafish browser-engine client with cancellation/stale-result protection, MultiPV parsing and PV replay.
- Optional server-side AI coach selector. The model selects only from verified coaching choices and cannot invent tactical facts.
- Reproducible engine bridge generation with pinned provenance and SHA-256 verification.
- Adaptive-practice recommendation and per-skill evidence summaries.
- 34 automated unit/transport tests.

## Verified in this workspace

- `npm run quality`: PASS.
- TypeScript: PASS.
- Vitest: 34/34 PASS.
- Prettier check: PASS.
- Production Vite build: PASS.
- Dev server returns COOP/COEP headers required for SharedArrayBuffer.

## Not yet verified

The execution environment used for this handoff blocks browser access to loopback/private network addresses at an organization-policy layer. Because of that, the following claims are deliberately **not** marked as passing:

- live Chromium WASM + NNUE startup,
- actual Pikafish search in a browser,
- desktop/mobile pointer flow,
- keyboard-only browser flow,
- visual regression/screenshot review,
- Safari/iPhone behavior,
- a real Experiential/GPT coaching response.

## Next milestone

Do not add 3D yet. First close the browser acceptance gate on a normal development machine or CI browser environment. Milestone 2 has started with a small skill graph and deterministic next-exercise recommendation. Continue with:

1. classify mistakes from engine-backed evidence,
2. add time-based retrieval scheduling instead of immediate recommendation only,
3. add curated tactical positions with expert/provenance metadata,
4. measure whether recommended review improves delayed recall,
5. only then prototype an optional 3D presentation and compare readability against 2D.
