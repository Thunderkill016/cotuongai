# Xiangqi Open-Source Atlas

Status: living research document. Updated 2026-09-07.

This document is the engineering map for studying the public Xiangqi ecosystem before reinventing existing work. It is intentionally **not** a code-dump list. We study architecture, algorithms, data contracts, UX patterns, protocols and tests, then reimplement only what fits Kỳ Lộ. Any direct reuse must pass a license/provenance review first.

## Principles

1. Do not assume GitHub popularity means Xiangqi correctness.
2. Rules, engine, presentation, online play, learning and AI coaching are separate concerns.
3. Prefer official or long-lived Xiangqi projects for chess-specific algorithms.
4. Keep exact upstream commit, license and file provenance for anything reused.
5. Never ingest an entire copyrighted book/database into the product merely because a copy exists online.
6. GPL code can be studied freely, but distribution obligations must be understood before direct reuse.
7. LLMs do not replace legality or engine evaluation.

---

# A. Engine / search / evaluation

## official-pikafish/Pikafish

Role: current reference-strength Xiangqi engine.

What to learn:
- UCI boundary and engine lifecycle.
- legal move/search integration for Xiangqi.
- iterative deepening, alpha-beta/PVS family, transposition tables, pruning, move ordering and time management inherited/evolved from Stockfish.
- NNUE evaluation in a Xiangqi engine.
- reproducible engine testing via Fishtest-style statistical testing.
- engine/net separation.

Product use:
- chess-analysis authority for Kỳ Lộ.
- post-game review, candidate comparison, tactical verification and difficulty control.
- never expose raw centipawn score as a complete lesson.

License/provenance:
- GPLv3.
- upstream README states the Pika Xiangqi Zero training data is ODbL.
- exact binary/source/network obligations must be checked for every distributed release.

Do not copy blindly:
- Stockfish-level search internals are not a learning UX.
- raw evaluation is not an explanation.

## official-pikafish/px0

Role: neural-network Xiangqi engine based on the Leela/Lc0 ecosystem, designed for PikaXiangqiZero networks.

What to learn:
- policy/value neural inference for Xiangqi.
- self-play architecture.
- GPU/CPU inference backends.
- UCI integration for neural engines.
- network versioning and game-quality enforcement.

Product relevance:
- future research for human-like style modelling, policy priors and move-distribution analysis.
- possible source for comparing search-based Pikafish recommendations against neural policy preferences.

License:
- GPLv3 or later according to repository README.

## official-pikafish/pxzero-networks

Role: public network repository for Pika Xiangqi Zero.

What to learn:
- network lifecycle/versioning.
- how strong Xiangqi neural networks are packaged and distributed.

Do not assume network files have the same commercial/reuse permissions as engine source. Verify per-file/network terms before redistribution.

## xqbase/eleeye

Role: classic ElephantEye / 象眼 Xiangqi engine and one of the best educational codebases for traditional Xiangqi-engine concepts.

Important lessons from its own technical documentation:
- UCCI protocol and `banmoves`.
- opening book extracted from elite tournament games.
- BitRanks / BitFiles for rook/cannon move generation.
- quiescence search focused on captures/check responses.
- repetition and perpetual-check handling.
- transposition tables.
- verified null-move pruning.
- iterative deepening.
- capture ordering, killer moves and history heuristic.
- check / single-response extensions.
- alpha-beta principal variation search.
- explicit separation of search and evaluation modules.
- evaluation features include attack/defence, phase, pins, rook mobility and horse obstruction.

Why this matters to Kỳ Lộ:
ElephantEye documents Xiangqi-specific thinking more explicitly than a modern highly optimized engine. It is a strong source for building human-readable mistake labels and educational engine features.

License:
- repository documentation describes GNU LGPL usage. Verify exact repository license text before any direct source reuse.

## xqbase ecosystem

Explore related xqbase repositories for:
- ElephantBoard / Xiangqi Wizard concepts.
- UCCI conventions.
- notation, opening-book tooling and game-record tooling.

These projects are especially useful as historical documentation for Chinese Xiangqi software conventions.

## yytdfc/ChineseChess-engines

Role: engine collection/reference.

Use only as an index for finding historical engines and comparing protocols/packaging. Do not redistribute bundled third-party binaries without verifying each component's license and source.

## walker8088/moonfish

Role: compact Xiangqi engine implementation.

Use for:
- understanding a smaller engine architecture before reading Pikafish-scale code.
- comparing minimal search/evaluation choices with production-strength engines.

## maksimKorzh/wukong-xiangqi

Role: Xiangqi programming/engine project with extensive educational material/assets.

Use for:
- move generation, board representation and search-study examples.
- approachable learning material for engine development.

Review license and current code quality before reusing source.

---

# B. Rules / notation / game records

## lengyanyu258/xiangqi.js

Role: JavaScript Xiangqi rules library.

Capabilities documented by upstream:
- move generation and validation.
- piece placement/removal.
- check/checkmate/stalemate.
- FEN.
- game history.
- PGN import/export.
- browser and Node support.

What Kỳ Lộ already learns from it:
- deterministic rules should live outside the board UI.
- position state must be replayable and testable.
- game records should be first-class data rather than UI strings.

Known upstream caveat:
- README notes PGN loading has known issues in some cases. Treat PGN import as untrusted input and test our own corpus.

License:
- BSD-2-Clause.

## lengyanyu258/xiangqiboardjs

Role: standalone JavaScript Xiangqi board component.

Most important architecture lesson:
> the board should be “just a board”.

The upstream project explicitly separates:
- visual board/pieces,
- Xiangqi rules,
- engine,
- PGN parser,
- server/game logic.

This matches the Kỳ Lộ architecture and should remain a hard design rule.

Useful UX concepts:
- showing positions with commentary.
- tactics / best-move interaction.
- PGN playback.
- server-backed online games.

License:
- MIT.

## yi-jiayu/xiangqiboardjs

Role: fork/variation of the board component, including experimental support such as dropped pieces.

Use for:
- API-extension patterns.
- studying how a board widget can remain independent from rules.

Not a rules authority.

---

# C. Full game / UX / trainer / review products

## abecomputersinc/xiangqi

Role: modern 2026 full Xiangqi desktop application.

Upstream feature set is directly relevant to what Kỳ Lộ currently lacks:
- full games vs Pikafish.
- local human vs human.
- online human vs human.
- ranked/random matchmaking and room codes.
- trainer mode.
- live evaluation.
- move-quality feedback.
- evaluation bar.
- PGN import/replay/export.
- FEN sharing.
- account/level system.
- platform-aware Pikafish binary selection.

Architecture lessons:
- separate Electron main/preload/renderer.
- separate online server.
- engine executables and NNUE are runtime assets.
- choose strongest compatible engine binary at runtime.
- game review and game playing are distinct modes.

Kỳ Lộ should study but improve on this design:
- web-first instead of Electron-first.
- learning model should track *why* a player erred, not only move-quality labels.
- review should create future retrieval exercises automatically.
- beginner language must be Vietnamese and progressive.

License:
- GPLv3 according to repository LICENSE.
- repository LICENSE also warns bundled Pikafish/NNUE components have their own terms. Treat this as a reminder to verify upstream network rights independently.

## ryoi/xiangqi

Role: React Xiangqi game with AI.

Reported useful patterns:
- click-select board interaction.
- adaptive difficulty.
- opening book support.
- move log.
- captured-piece display.
- evaluation bar.
- game-end overlay and statistics.
- undo/reset.
- responsive web UI.

Use for UX comparison, not as chess authority until its rules/engine are independently tested.

## nvatuan/chinese-chess-assistance

Role: chess-assistance application.

Study:
- board recognition/assistance workflows if relevant.
- analysis UI patterns.

Do not introduce cheating-assistance features into online competitive play. Any imported idea should be restricted to self-study/review contexts.

## YoungerIOS/chess-helper

Role: helper/analysis tooling.

Study only for legitimate post-game/self-study UX patterns. Avoid real-time third-party-game assistance.

## duanegoodner/xiangqigame

Role: full Xiangqi game implementation.

Use as a comparison point for:
- game-state architecture.
- UI flow.
- end-state handling.

Validate rules and license before any reuse.

---

# D. AI / machine learning / experimental systems

## official-pikafish/px0 + pxzero-networks

Primary open-source Xiangqi neural reference. See section A.

## Laffinty/llm-xiangqi

Role: explicit LLM + Xiangqi experiment.

Study questions:
- how board state is represented to an LLM.
- legality failure modes.
- whether tool-mediated move generation is used.

Kỳ Lộ policy:
- LLM may explain, ask questions, choose among verified coaching intents, summarize game history and personalize practice.
- LLM must not become move-legality or best-move authority.

## zhongyi-tong/IntelligentChineseChessSystem
## shuiki/Chinese-Chess-AI
## BeGifted/Chinese-chess-AI
## Trussin/Chinese-Chess-AI
## MunKwaii/AI_Project_ChineseChess

Role: academic/student/experimental AI implementations.

Use them as a comparative laboratory for:
- minimax / alpha-beta implementations.
- heuristic evaluation.
- board representations.
- training experiments.

Do not assume strength, rules completeness or production readiness from repository naming.

---

# E. Current Kỳ Lộ architecture lessons derived from the ecosystem

## 1. Keep six boundaries

```text
Rules authority
  -> deterministic Xiangqi library + additional rule tests

Engine authority
  -> Pikafish / future verified engine adapters

Game state
  -> FEN + move list + clock/result/repetition metadata

Board presentation
  -> React board; no chess truth inside components

Learning model
  -> skill graph + mistake events + retrieval schedule

AI coach
  -> tool-bound explanations/pedagogy, never legal-move authority
```

## 2. Full-game loop must become primary

The ecosystem shows that a usable Xiangqi product needs a real game loop, not only puzzles.

Target:

```text
Play full game
 -> record every decision
 -> Pikafish post-analysis
 -> detect critical moments
 -> classify mistake mechanism
 -> ask learner to solve position again without engine
 -> explain in Vietnamese Xiangqi language
 -> schedule a related retrieval task
 -> track recurrence across later games
```

## 3. Opening knowledge should be game-record driven

ElephantEye historically builds its book from thousands of elite tournament games. Modern Kỳ Lộ should similarly treat opening knowledge as data derived from provenance-bearing games, not LLM prose.

Opening data model should include:
- normalized position key.
- move.
- frequency.
- red/black/draw results when source permits.
- player/event/date/source.
- engine evaluation snapshot separately from human frequency.
- opening-family labels.

## 4. Mistake classification can use Xiangqi-engine concepts

From traditional engine/evaluation literature and modern search output, candidate educational labels include:
- illegal move / rule misunderstanding.
- missed capture.
- hanging piece / immediate recapture.
- missed check.
- failed check response.
- horse-leg obstruction.
- cannon-screen misunderstanding.
- exposed general / flying-general issue.
- pinned/overloaded defender.
- lost tempo / loss of initiative.
- premature attack.
- undeveloped rook/cannon/horse.
- weak king palace / deficient advisors-elephants.
- poor trade.
- tactical horizon error.
- repeated-check/chase rule issue.
- endgame conversion error.

These labels must be produced from deterministic and engine evidence, with LLM wording added only after classification.

## 5. Difficulty must not be “random bad moves” only

Study ElephantEye's explicit randomness levels and modern game apps' adaptive difficulty, then implement strength control by combining:
- engine MultiPV candidates.
- bounded evaluation-loss bands.
- response time.
- opening repertoire.
- style preferences.
- occasional human-like error families appropriate to target level.

Never deliberately play illegal moves.

## 6. Review is more important than live engine hints

Live engine arrows can prevent learning. Default learning mode should hide engine recommendations during play. After the move/game, reveal analysis progressively.

## 7. PGN/FEN interoperability is mandatory

Support:
- FEN position sharing.
- ICCS/UCI coordinates internally.
- robust PGN import/export.
- future Chinese descriptive notation display as a presentation layer.

Input files are untrusted: parser validation and move replay are mandatory.

---

# F. Reuse priority for Kỳ Lộ

## Directly suitable as foundations

1. `official-pikafish/Pikafish` — engine authority; retain GPL/provenance obligations.
2. `lengyanyu258/xiangqi.js` — deterministic rules baseline; BSD-2-Clause.
3. `lengyanyu258/xiangqiboardjs` — architecture/UX reference; MIT; do not need to replace our React board with its jQuery implementation.

## Study deeply, mostly reimplement concepts

4. `xqbase/eleeye` — classic Xiangqi engine architecture and terminology.
5. `official-pikafish/px0` — neural/self-play architecture.
6. `abecomputersinc/xiangqi` — full product/game/trainer/review/online architecture.
7. `maksimKorzh/wukong-xiangqi` — educational engine implementation.
8. `ryoi/xiangqi` — web UX patterns.

## Comparative/experimental references

9. `walker8088/moonfish`
10. `nqviet/ChineseChessEngine`
11. `Southhill/xiangqi-engine`
12. `zhongyi-tong/IntelligentChineseChessSystem`
13. `shuiki/Chinese-Chess-AI`
14. `BeGifted/Chinese-chess-AI`
15. `Trussin/Chinese-Chess-AI`
16. `MunKwaii/AI_Project_ChineseChess`
17. `Laffinty/llm-xiangqi`
18. `duanegoodner/xiangqigame`
19. `nvatuan/chinese-chess-assistance`
20. `yytdfc/ChineseChess-engines`

This list is deliberately expandable. Search should continue in Chinese (`象棋`, `中国象棋`, `棋谱`, `残局`, `开局库`, `UCCI`) as well as English (`xiangqi`, `Chinese chess`, `cchess`).

---

# G. What we should build next after this study

1. Full legal game mode with clocks, resign/draw/game-over and reliable move record.
2. Human-level AI difficulty built from MultiPV/eval-loss bands rather than just search depth.
3. Post-game analyzer that extracts only critical learning moments.
4. Mistake taxonomy backed by rules + engine deltas.
5. PGN/FEN study room with replay and annotations.
6. Opening explorer from provenance-bearing game records.
7. Endgame/tactical corpus ingestion with source metadata.
8. AI coach using structured tools over those verified facts.
9. Player model that tracks recurring error families and schedules review.
10. Online play only after local game/review loop is solid and anti-cheat boundaries are explicit.

---

# H. Research process for every new repository

For each candidate repo, record:

```yaml
repo:
commit_or_release:
last_reviewed:
license:
activity_status:
category:
xiangqi_rules_coverage:
protocols:
useful_modules:
known_limitations:
security_notes:
data_sources:
redistribution_notes:
ideas_to_reimplement:
code_to_reuse_directly:
required_attribution:
```

Never merge external source into Kỳ Lộ without completing this record.
