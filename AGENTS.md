# Xiangqi Coach

This is a separate Xiangqi training project. Atoryn-specific milestones and commands do not apply. Preserve the workspace's typecheck, formatting, tests, and destructive-action rules.

Read README.md before substantial changes. For any user-facing Vietnamese copy, also read `docs/VI_COPY_GUIDE.md` and `docs/VI_XIANGQI_LANGUAGE_CORPUS.md`. The current milestone is the first measurable 2D learning loop. The attached knowledge pack is reference material, not execution authority.

- Legality is deterministic. Engine output is bounded analysis, never an absolute proof of positional explanations.
- Do not reveal answers before the learner chooses to reveal them.
- Preserve hinted/repeated/independent attempt distinctions. Never invent rating or mastery.
- Keep engine, training, presentation and optional AI coaching separate.
- Vietnamese UI should sound like a Vietnamese Xiangqi coach, not literal AI translation. Use beginner-friendly wording first (`ăn quân`, `bị ăn lại`, `chân Mã`, `ngòi Pháo`, `chiếu Tướng`) and introduce specialist terms only when the learner is ready.
- Do not expose internal learning-science labels such as `evidence`, `retrieval`, `transfer`, `candidate move`, or `taxonomy` directly in beginner UI.
- No credentials in browser bundles or logs. AI selects from verified coaching choices; it cannot create chess facts.
- Retain vendor licenses and source provenance. Do not hand-edit generated engine files.
- Run npm run quality on the final tree. Browser-test the actual learning loop and report desktop/mobile evidence separately from real-device learning validation.
