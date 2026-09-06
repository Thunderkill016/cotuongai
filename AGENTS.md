# Xiangqi Coach

This is a separate Xiangqi training project. Atoryn-specific milestones and commands do not apply. Preserve the workspace's typecheck, formatting, tests, and destructive-action rules.

Read README.md before substantial changes. Before designing or reimplementing Xiangqi functionality, read `docs/XIANGQI_OPEN_SOURCE_ATLAS.md`, `docs/XIANGQI_KNOWLEDGE_SYSTEM.md`, and `docs/XIANGQI_HISTORY_AND_GAME_SOUL.md` so existing Xiangqi engines, rules libraries, protocols, game products and historical software patterns are studied before inventing new architecture. For any user-facing Vietnamese copy, also read `docs/VI_COPY_GUIDE.md` and `docs/VI_XIANGQI_LANGUAGE_CORPUS.md`.

- Legality is deterministic. Engine output is bounded analysis, never an absolute proof of positional explanations.
- Do not reveal answers before the learner chooses to reveal them.
- Preserve hinted/repeated/independent attempt distinctions. Never invent rating or mastery.
- Keep engine, training, presentation and optional AI coaching separate.
- Vietnamese UI should sound like a Vietnamese Xiangqi coach, not literal AI translation. Use beginner-friendly wording first (`ăn quân`, `bị ăn lại`, `chân Mã`, `ngòi Pháo`, `chiếu Tướng`) and introduce specialist terms only when the learner is ready.
- Do not expose internal learning-science labels such as `evidence`, `retrieval`, `transfer`, `candidate move`, or `taxonomy` directly in beginner UI.
- No credentials in browser bundles or logs. AI selects from verified coaching choices; it cannot create chess facts.
- Retain vendor licenses and source provenance. Do not hand-edit generated engine files.
- External repositories are references, not a license-free code pool. Record upstream commit/release, license and provenance before direct reuse. Prefer reimplementing concepts when license or redistribution terms are unclear.
- Run npm run quality on the final tree. Browser-test the actual learning loop and report desktop/mobile evidence separately from real-device learning validation.
