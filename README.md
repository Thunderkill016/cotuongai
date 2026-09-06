# Kỳ Lộ — Xiangqi Coach

An independent, Vietnamese 2D Xiangqi trainer. First milestone: a beginner can inspect a position, choose a legal capture, use progressively clearer hints, inspect real Pikafish analysis, and attempt a different position without help.

## Scope and acceptance

The first learning outcome is **identify a legal capture and check the opponent's immediate recapture**. Hand-authored miniature positions are engineering/teaching fixtures, not expert-approved curriculum. Store first attempts, retries, hints and answer reveals separately. No Elo, mastery, club-level promise or learner-effectiveness claim.

The full slice includes keyboard/touch board, legal moves, candidate selection, gated hints, real browser WASM analysis, replayable PV, optional server-side AI hint selection, free analysis from the opening, and local attempt history. 3D, accounts, multiplayer, full tournament repetition adjudication and generated curricula are out of scope.

Success gates: rules regression fixtures; all curated solution moves legal; PV legal at the requested root; typed cp/mate scores; stale/cancelled result exclusion; validated persistence; bounded AI choices; responsive browser smoke; clean typecheck/build.

## Development

Node 22+. Run `npm ci`, `npm run prepare:engine`, then `npm run dev`. The prepare step fetches the pinned Pikafish WASM/NNUE artifacts on first use, verifies SHA-256, and caches them under `vendor/pikafish/`; the ~51MB NNUE is not committed to this repository. Open http://localhost:4180. `npm run quality` runs typecheck, tests, formatting and production build. `npm start` serves the built application with the same engine headers and coach API.

The engine is a pthread WASM build and requires cross-origin isolation (COOP/COEP). The included server supplies these headers. Unsupported environments keep the rules and exercises usable and explicitly disable analysis. This is not a single-thread fallback build. Localhost is a secure-context exception; remote hosting needs HTTPS and equivalent headers.

AI coaching optionally uses `EXPLABS_API_KEY` and the configurable server-side gateway in `.env.example`. Without credentials, curated hints work and are labeled accordingly. The AI chooses among validated hints/questions: it does not author tactical facts. Provider failures fall back to the same vetted material and are labeled. A small request limit bounds local usage. Never expose this development server to the public internet without deployment-specific access and abuse controls.

## Adaptive practice (M2 started)

The progress dialog now derives bounded skill evidence from local attempts and recommends the next exercise. It deliberately reports **evidence**, not mastery: a first-attempt success without hints/reveal is distinguished from assisted success, failure and untested skills. The recommender prioritizes failed recent work and assisted-only successes before unseen material. This is a deterministic local heuristic and is not yet spaced repetition or a validated learner model.

## Rules and evidence boundaries

`vendor/xiangqi` is the pinned BSD-2-Clause rules library; our wrapper validates FEN and checks both kings, palace constraints and facing generals. The board uses ICCS coordinates (a0–i9); red is at the bottom. `r` in the library FEN is normalized to `w` at the Pikafish boundary.

We use legal movement, check, checkmate and stalemate from the rules library. Full WXF perpetual-check/chase adjudication is not claimed. Repetition in the free board stops further analysis with an explicit unsupported-adjudication message. Rules reference: https://www.wxf-xiangqi.org/images/wxf-rules/2018_World_XiangQi_Rules_English2018.pdf .

Pikafish/NNUE identifies preferred lines within a fixed search budget. Every result retains its root, move history, depth, nodes, time, score type and engine build. Finite search is not proof of teaching correctness. Delayed learner evaluation and physical-device testing remain separate from engineering tests.

## Reuse and licenses

This project is GPL-3.0-only. See LICENSE and vendor/PROVENANCE.json for immutable upstream revisions and checksums. Pikafish is reused from Chinese-Chess-AI-Pro; its upstream compiled C++/WASM is unchanged. `scripts/prepare-engine.mjs` downloads the exact pinned upstream artifacts when missing, verifies SHA-256, replaces the JS UCI bridge and caps its worker pool reproducibly. Our bridge source and transformation script are included here, while `vendor/PROVENANCE.json` pins the upstream source commit. Public distribution must still satisfy GPLv3 corresponding-source obligations for the engine binary it ships.

Knowledge-pack input: xiangqi_gpt6_knowledge_pack.zip, SHA256 e911bc8580e390be4130d3b443031f7d3298ef32fe0be1640b004aedfa415576. Its product doctrine and learning-first approach informed this scope; it is not automatically installed as agent instructions.

## Verification

Local verification on 2026-09-06:

- `npm run quality`: PASS on the final application tree. Typecheck clean; 34/34 tests across two files; formatter clean; production build successful.
- The tests cover movement restrictions, facing generals, exact undo, repetition detection, stalemate, all four original exercise solutions, immediate recaptures, assistance/history validation, adaptive recommendation/skill summaries, cp/mate/bound parsing, coherent MultiPV selection, legal PV replay, invalid AI selections, request cancellation, stale results, Worker failure/reload and timeout.
- The bridge is also exercised in a JavaScript VM with a simulated C++ boundary. It defers UCI output handling until after the C++ callback returns and waits for the previous `bestmove` before starting another position. These are transport tests, **not live engine execution**.
- Upstream engine files pass recorded SHA256 checks before every build. The final browser glue is generated from our checked-in bridge; the original WASM is preserved.
- Local dev server started at http://localhost:4180 with coach configuration detected. Configuration presence does not prove a successful provider call.

**Open acceptance gates:** browser WASM/NNUE startup and actual search; real coach response; desktop/mobile pointer and keyboard flow; visual review; Safari/iPhone and lower-end physical devices; expert curriculum review; delayed learner evaluation. Playwright CLI could not run because automatic approval review rejected its escalation with an account usage-limit error. No browser screenshots or passing live-engine/AI claims are available from this run. No deployment or learning improvement has been established.

Browser acceptance sequence when execution is available:

1. Open the local server; confirm `crossOriginIsolated` and engine readiness with no console errors.
2. Try an illegal rook move, then b0→b3 in the first exercise. Verify immediate-capture feedback and exactly one saved attempt.
3. Reveal analysis only explicitly; validate that the reported PV plays legally and that another candidate can be analyzed. Verify the returned coaching source is actually `ai` before calling it live AI evidence.
4. Change exercise or undo during search; no result from the old position may update the board or coach.
5. View a hint before submitting, reload, then solve; the attempt must retain assistance exposure. Viewing a solution must never append a solved attempt.
6. Exercise the free board, an engine reply, undo, current-position analysis and PV playback. Verify side-to-move and pre-move analysis labels.
7. Repeat the critical loop at 390px width and with keyboard-only input in Chromium, Firefox and WebKit. Record physical Safari testing separately.

Local history is convenience data, not an authoritative assessment database. It is not tamper-proof, and concurrent multi-tab submissions are not a transactional learner record.
