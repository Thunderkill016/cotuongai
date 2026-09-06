# Xiangqi Data, Record, Vision and Tooling Repositories

Updated 2026-09-07. Companion to `XIANGQI_OPEN_SOURCE_ATLAS.md`.

Search must include Chinese terms (`象棋`, `中国象棋`, `棋谱`, `残局`, `开局库`) because English-only GitHub search misses a large part of the Xiangqi ecosystem.

## Game records / 棋谱 / parser candidates

### weiyinfu/xqp

Discovered through `象棋 棋谱` search. Candidate for studying Xiangqi game-record representation and tooling. Before use, inspect README, formats, parser behavior and license. Potential value: building a normalized game-record ingestion pipeline.

### jcq15/chessmanual

Candidate repository focused on chess manuals / game records. Study:
- how records are represented,
- browsing/search UX,
- whether source metadata is retained,
- conversion formats.

Do not ingest bundled manuals blindly; individual game collections/books may have separate copyright/data rights.

### simplify-life/ChessParser

Candidate parser project. Study:
- input formats,
- notation conversion,
- error recovery,
- validation behavior.

Kỳ Lộ rule: every imported record must be replayed through deterministic legal-move validation before entering the canonical database.

### Darksiderlyd/PgnTool

Candidate PGN tool. Study conversion and batch-processing workflows.

### JumuFENG/cnchess-misc

Small miscellaneous Chinese-chess tooling repository. Use as an index/reference for file formats and utility ideas.

### g089h515r806/we_cn_chess

Candidate record/game utilities. Audit before reuse.

## Board/image recognition

### TheOne1006/chinese-chess-recognition

Role: Xiangqi recognition from visual input.

Potential Kỳ Lộ feature:
- user photographs a physical board,
- app detects grid/pieces,
- user confirms uncertain squares,
- deterministic rules validate the resulting position,
- Pikafish analyzes only after confirmation.

Study:
- board localization,
- piece classification,
- rotation/orientation handling,
- confidence scores,
- dataset structure,
- failure cases.

Safety/product requirement: never silently trust CV output as a legal position. Always show confidence/confirmation when uncertain.

### idonthavename/recognition-chinese-chess

Second independent recognition implementation. Compare model/data pipeline with the repository above. Multiple independent implementations are valuable for identifying recurring image-recognition problems rather than copying one pipeline.

## Online play / game server references

### frei-x/ChineseChessOnline

Candidate online Xiangqi implementation.

Study:
- client/server state synchronization,
- room/game flow,
- move validation ownership,
- reconnection,
- clocks/result handling.

Kỳ Lộ rule for future multiplayer: server must be authoritative for legality, clock and game result. Never trust browser-submitted state.

### abecomputersinc/xiangqi

Already cataloged in the main atlas. Particularly relevant endpoints/patterns include auth, matchmaking, room codes, move relay, resignation, rematch and game-over persistence.

## GUI / application comparison

### zimya/chess-next
### XJC-git/ChineseChess-Project
### liujh168/cch
### kuiba1949/cchess

Audit as comparison implementations for:
- board UX,
- notation/history,
- game setup,
- analysis integration,
- responsive/mobile behavior,
- game-end flow.

Do not infer correctness from a working UI; compare legal-move test coverage against our deterministic rules suite.

## Recognition and assistance boundary

Some public Xiangqi repos are designed for live assistance or board recognition. Kỳ Lộ may reuse *study* concepts for:
- importing a position from a photo,
- analyzing the user's own game,
- reconstructing a physical-board study position.

Do **not** build or market real-time hidden assistance for cheating in third-party competitive games.

## Canonical ingestion design learned from this ecosystem

```text
Raw source
  -> source adapter
  -> parse notation / record format
  -> normalize sides + coordinates
  -> deterministic replay
  -> reject/flag illegal sequence
  -> attach provenance
  -> deduplicate positions/games
  -> optional Pikafish annotation
  -> derived educational motifs
```

Canonical game record should eventually include:

```ts
interface CanonicalXiangqiGame {
  id: string;
  source: {
    type: "official" | "public-domain" | "licensed" | "user" | "research";
    url?: string;
    title?: string;
    author?: string;
    event?: string;
    retrievedAt: string;
    license?: string;
  };
  red?: string;
  black?: string;
  event?: string;
  date?: string;
  result: "red" | "black" | "draw" | "unknown";
  initialFen: string;
  moves: string[]; // canonical ICCS/UCI-style coordinates internally
  originalNotation?: string;
  tags: string[];
}
```

Derived annotations must be stored separately from source record:
- engine evaluation,
- opening-family classification,
- tactical motifs,
- critical moments,
- learner-facing explanation.

This prevents an LLM-generated explanation from becoming indistinguishable from historical source data.

## Next audits

For each repository above, inspect:
1. README and activity.
2. exact license.
3. supported record formats.
4. coordinate/notation conventions.
5. legality assumptions.
6. test corpus.
7. external datasets and their rights.
8. reusable algorithmic ideas.

The purpose is not to vendor every repository. The purpose is to make Kỳ Lộ the integration point for the best verified ideas across the Xiangqi open-source ecosystem.
