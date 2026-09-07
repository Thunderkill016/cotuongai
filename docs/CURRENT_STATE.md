# Current state — 2026-09-07

## Shipped baseline

- Full standard games against browser Pikafish, either side, practice/challenge, undo policy, resignation, replay and validated local persistence.
- Vietnamese move notation in game history, post-game review and due practice.
- Procedural 3D with narrow-screen framing, tap/drag separation, horse legs, cannon screens, checked general cues and verified consecutive capture animation. Reduced-motion support and automatic 2D fallback on WebGL initialization failure.
- Bounded post-game analysis and retry before revealing the saved engine line.
- Due-only practice sessions of up to five distinct positions, oldest overdue first, explicit completion, repeated-attempt scheduling distinction and validated stored lines.
- Portable Kỳ Lộ JSON game files with validated standard FEN/moves, replacement preview and replay-first opening. No PGN/XQF or arbitrary-position import claim.
- Original trainer, hint/reveal tracking, optional server-side coach, provenance registry and pinned engine assets remain.

## Current verification

- PR 16 (3D) merged as `90130a3e5c31736d5112a489490ba6a130459e66`; GitHub deployment status reports Production success.
- PR 17 (practice) merged as `d7382ce495cca229517b29b51409e6a36a1ef278`; GitHub deployment status reports Production success.
- Local `npm run quality` passes: typecheck, 89 tests, formatting and production build, including portable-game work.
- Local production Chromium verified 390px framing, drag returning to its starting point without changing a game, reduced-motion switching, forced WebGL failure with legal 2D play and real Pikafish reply.
- Local Chromium completed actual play, resignation, bounded review and retry/card creation. A simulated clock verified due entry, answer gating, Vietnamese notation, session completion and reload without repeating the just-finished card.
- Local Chromium verified real JSON download/upload, preview cancellation, malformed-file rejection without overwriting the current game, exact round-trip and resuming a pending AI turn only after leaving replay. Desktop and 390px mobile screenshots were inspected.
- Physical-device performance, Safari/iPhone, human readability/learning comparisons and delayed learner outcomes remain unverified. Deployment status is not production-browser acceptance.

## Current continuation

- Extend due sessions with the existing foundational/transfer exercises while preserving separate assistance and provenance histories.
- Classical playable content still needs edition/page-level transcription, rights review and rules/engine verification. The registry alone is not playable or verified curriculum.
- Full tournament perpetual-check/chase adjudication remains unsupported; repetition pauses without inventing a draw.

Follow `docs/CODEX_MAX_MISSION.md` for priority order. Older verification notes are historical, not current blockers.
