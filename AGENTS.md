# Xiangqi Coach

This is a separate Xiangqi training project. Atoryn-specific milestones and commands do not apply. Preserve the workspace's typecheck, formatting, tests, and destructive-action rules.

Read `README.md` before substantial changes. The current autonomous execution mission is `docs/CODEX_MAX_MISSION.md`; when operating in Codex/agent mode, read it before planning or coding and continue through its priority order until a real hard stop is reached. Before changing chess content, curriculum, AI coaching, opening/endgame material, or historical claims, also read `src/knowledgeVault.ts` and `docs/XIANGQI_KNOWLEDGE_VAULT.md`. For user-facing Vietnamese copy, read `docs/VI_COPY_GUIDE.md` and `docs/VI_XIANGQI_LANGUAGE_CORPUS.md`.

- Legality is deterministic. Engine output is bounded analysis, never an absolute proof of positional explanations.
- Pikafish/rules code decides chess truth; an LLM may explain, compare, plan practice, or select from verified choices, but must not invent legal moves, forced wins, opening theory, historical provenance, or endgame results.
- Historical manuals are provenance-bearing sources, not scripture. Preserve edition/variant identity and recheck positions with current rules plus engine analysis before teaching them.
- Lost works such as reconstructed `金鹏十八变` or `梦入神机` must never be represented as directly recovered originals without primary evidence.
- Copyrighted modern books are reference-only unless explicit rights permit reuse. Do not paste or bulk-ingest copyrighted prose into the product.
- Preserve hinted/repeated/independent attempt distinctions. Never invent rating or mastery.
- Keep engine, training, presentation, knowledge ingestion and optional AI coaching separate.
- 3D is not decoration: it must improve board readability, tactical understanding or emotional engagement. Maintain a 2D fallback and keep interaction synchronized with the deterministic board state.
- Vietnamese UI should sound like a Vietnamese Xiangqi coach, not literal AI translation. Use beginner-friendly wording first (`ăn quân`, `bị ăn lại`, `chân Mã`, `ngòi Pháo`, `chiếu Tướng`) and introduce specialist terms only when the learner is ready.
- Do not expose internal learning-science labels such as `evidence`, `retrieval`, `transfer`, `candidate move`, or `taxonomy` directly in beginner UI.
- No credentials in browser bundles or logs. AI selects from verified coaching choices; it cannot create chess facts.
- Retain vendor licenses and source provenance. Do not hand-edit generated engine files.
- Run `npm run quality` on the final tree. Browser-test the actual learning loop and report desktop/mobile evidence separately from real-device learning validation.
