# Codex Max Mission — Kỳ Lộ / Cờ Tướng AI 3D

## Operating mode

Work autonomously on this repository until one of these hard stops happens:

1. the Codex/plan quota or execution limit is reached;
2. a required external credential, paid service, or account permission is unavailable;
3. a destructive or irreversible operation would require owner approval;
4. a licensing/provenance question cannot be resolved safely;
5. the environment prevents meaningful progress after reasonable retries.

Do **not** stop merely because one milestone is complete. When a milestone passes, immediately continue to the next highest-value milestone.

Before substantial work, read:
- `README.md`
- `AGENTS.md`
- `docs/XIANGQI_HISTORY_AND_GAME_SOUL.md` if present
- `docs/XIANGQI_OPEN_SOURCE_ATLAS.md` if present
- `docs/XIANGQI_REPO_DATA_AND_TOOLS.md` if present
- `docs/XIANGQI_KNOWLEDGE_SYSTEM.md` if present
- `docs/XIANGQI_KNOWLEDGE_VAULT.md`
- `src/knowledgeVault.ts`
- `docs/VI_COPY_GUIDE.md`
- `docs/VI_XIANGQI_LANGUAGE_CORPUS.md`

The owner wants execution, not another high-level roadmap. Prefer shipping tested code over writing speculative design documents.

---

## Product mission

Turn the current project into a serious modern Xiangqi product that can help a beginner become a much stronger player through repeated cycles of:

**learn → play → make mistakes → understand mistakes → practice targeted positions → review later → play again**

The product should feel like a living Xiangqi battlefield and training hall, not a dry 2D puzzle page.

The long-term target is a web product combining:
- full legal Xiangqi gameplay;
- strong Pikafish analysis;
- AI coaching grounded in verified chess evidence;
- Vietnamese Xiangqi language that sounds natural;
- historical/classical Xiangqi knowledge with provenance;
- personalized training and spaced review;
- a readable, playable 3D battlefield;
- optional 2D fallback;
- game review, PGN/XQF-style import/export where feasible;
- later, online/competitive features only after core learning/play loops are reliable.

---

## Non-negotiable architecture

### Chess truth

- Deterministic rules code is the authority for legality.
- Pikafish is the authority for bounded engine analysis.
- LLM/AI is a coach/explainer/planner only.
- The LLM must never invent legal moves, forced mates, opening theory, historical claims, or endgame truth.
- Any AI-facing chess explanation must be grounded in verified board state and engine/rules evidence.

### Learning truth

- Do not claim Elo gain, mastery, expert level, or scientifically validated improvement without real evidence.
- Preserve distinctions between hinted, revealed, repeated, assisted, and independent attempts.
- Build practice around measurable mistakes and retrieval, not generic content completion.

### 3D truth

- 3D must never reduce board readability.
- 3D is synchronized to deterministic game state; it cannot have a separate rules model.
- Always preserve a usable 2D fallback.
- Animation must be short, skippable/reduced-motion aware, and informative.

### Knowledge truth

- Preserve source provenance, edition identity, and rights status.
- Modern copyrighted books are reference-only unless explicit reuse rights exist.
- Do not paste copyrighted books into the repository.
- Lost or reconstructed works must be labeled as reconstructed/secondary, never presented as recovered originals without evidence.
- Classical positions/ideas should be normalized, legality-checked, engine-checked where appropriate, and rewritten in original Vietnamese teaching copy.

---

## Current product state to respect

The repository already contains:
- deterministic Xiangqi board/rules integration;
- Pikafish client/worker analysis;
- training exercises and attempt history;
- spaced-retrieval primitives;
- Vietnamese copy guidance;
- a provenance-aware Xiangqi knowledge vault;
- Three.js 3D battlefield with procedural soldiers/horse/elephant/chariot/cannon/commander;
- camera orbit/zoom;
- direct 3D picking;
- move animation;
- 2D fallback;
- current quality command: `npm run quality`.

Do not regress these.

---

# Priority order

Keep working through this list. If one item is blocked, move to the next useful item and come back later.

## P0 — Make full-game Xiangqi genuinely playable

This is the highest priority.

Implement a real full-game flow instead of only miniature training positions.

Required capabilities:
- start from standard Xiangqi position;
- human chooses Red/Black where practical;
- legal turn enforcement;
- play against AI;
- AI move generation through Pikafish or a bounded engine adapter;
- resign;
- restart;
- undo only where the chosen mode allows it;
- game-over detection;
- check/checkmate/stalemate/draw handling according to supported rules;
- move history;
- replay navigation;
- clear current-turn indicator;
- clock support only after the basic loop is stable;
- browser persistence for unfinished local games if practical.

Acceptance target:
A user can open the web app, start a normal Xiangqi game, make legal moves, receive engine opponent moves, finish or resign the game, and replay the game afterward.

Add tests for core state transitions and result handling.

---

## P1 — Turn 3D into an actual Xiangqi battlefield

Upgrade `Battlefield3DEnhanced.tsx` incrementally. Do not rewrite the whole renderer unless necessary.

### Capture animation

When a move captures:
- identify captured piece from pre-move state;
- animate attacker toward destination;
- animate target reacting/disappearing or falling back;
- keep total sequence short;
- never delay board state correctness;
- reduced-motion users get immediate state change plus minimal highlight.

### Cannon-specific visualization

For cannon captures:
- identify the exact screen piece;
- visually emphasize the cannon → screen → target relationship;
- optional muzzle flash/projectile line is acceptable;
- do not create fake physical rules inconsistent with Xiangqi;
- make the concept of `ngòi Pháo` visually obvious.

### Horse-leg visualization

When a horse is selected or a horse move is rejected because of a blocked leg:
- highlight the horse-leg square;
- show legal horse paths distinctly;
- if blocked, briefly emphasize the blocking square/piece;
- this must teach `chân Mã`, not just look pretty.

### Check visualization

When a king/general is in check:
- emphasize the threatened general;
- show the attack line/path when it is deterministic and readable;
- add a short Vietnamese battlefield status such as `Đỏ đang chiếu Tướng` / `Đen đang chiếu Tướng`;
- avoid noisy effects.

### Piece motion personality

Continue differentiating motion:
- chariot: fast, direct, low arc;
- horse: curved/lifted cavalry motion;
- elephant: heavy, slower;
- cannon: recoil/muzzle cue on capture;
- soldier: direct march;
- advisor/general: restrained palace movement.

Do not add expensive external 3D assets unless licensing is clear and the performance budget is acceptable.

---

## P2 — Post-game review that actually teaches

After each full game:

1. analyze the game with Pikafish in a bounded pass;
2. identify only a small number of high-value learning moments, roughly 3–7;
3. avoid commenting every move;
4. classify mistakes into understandable categories;
5. hide the engine answer first and ask the user to retry the position;
6. only then reveal engine evidence and coaching;
7. convert useful mistakes into future review items.

Initial mistake taxonomy can include:
- treo quân / mất quân trực tiếp;
- bỏ sót nước chiếu;
- ăn quân bị ăn lại;
- tính thiếu nước đáp;
- bỏ lỡ sát pháp;
- chân Mã bị chặn;
- dùng Pháo sai ngòi;
- Xe chưa thông / tự chặn đường quân;
- khai cuộc chậm phát triển;
- đổi quân bất lợi;
- Tướng/Sĩ/Tượng yếu;
- tàn cuộc xử lý sai.

Do not expose internal taxonomy names if they sound academic. Use natural Vietnamese in UI.

---

## P3 — Build “Hôm nay cần luyện gì” into a real session system

Use the existing retrieval work.

Implement:
- due review queue;
- overdue first;
- then unseen foundational material;
- then transfer positions;
- bounded session size (around 5 items initially);
- Vietnamese due labels such as `Ôn ngay`, `Ôn sau`, `Ôn ngày mai`;
- mistake history with last attempt, mistake kind, assistance/reveal state, next due time;
- session completion summary without fake mastery claims.

Add deterministic tests for ordering and scheduling labels.

---

## P4 — Convert the Knowledge Vault into playable knowledge

Do not leave `knowledgeVault.ts` as a static catalog.

Build a normalized playable content layer.

Suggested model:

```ts
interface KnowledgePosition {
  id: string;
  sourceId: string;
  edition?: string;
  titleVi: string;
  titleZh?: string;
  fen: string;
  sideToMove: "r" | "b";
  category: "opening" | "middlegame" | "endgame" | "tactic" | "composition";
  motifs: string[];
  historicalNote?: string;
  verified: {
    legality: boolean;
    engine?: boolean;
    provenance: boolean;
  };
  rights: string;
}
```

First playable knowledge set should cover a small, high-quality selection from the classical corpus rather than hundreds of unverified positions.

Candidate source families:
- 橘中秘 / Quất Trung Bí;
- 梅花谱 families / Mai Hoa Phổ variants;
- 适情雅趣 / Thích Tình Nhã Thú;
- 梦入神机-derived reconstructed traditions, clearly labeled secondary/reconstructed;
- 百局象棋谱;
- 韬略元机;
- 心武残编;
- modern public/redistributable game records and open datasets.

For each imported position:
- record provenance;
- verify FEN legality;
- engine-check the intended line when relevant;
- produce original Vietnamese explanation;
- never copy copyrighted annotation text.

---

## P5 — Opening learning by ideas, not rote memorization

Build opening families gradually:
- Pháo Đầu;
- Thuận Pháo;
- Nghịch Pháo;
- Bình Phong Mã;
- Phản Cung Mã;
- Tam Bộ Hổ;
- Đơn Đề Mã;
- Phi Tượng Cuộc;
- Tiên Nhân Chỉ Lộ;
- Quá Cung Pháo;
- Sĩ Giác Pháo;
- Khởi Mã Cuộc;
- important sub-ideas such as Hoành Xa, Tuần Hà Xa, Quá Hà Xa, Ngũ Lục Pháo, Ngũ Thất Pháo where provenance/data supports them.

Teach:
- what the opening is trying to achieve;
- common plans;
- recurring tactical risks;
- development/coordination ideas;
- representative positions;
- only then deeper branches.

Do not present engine novelty as historical theory without provenance.

---

## P6 — Endgame and tactical curriculum

Build reusable skill graphs for:
- basic mating nets;
- common `sát pháp` motifs;
- rook/cannon/horse coordination;
- advisor/elephant structures;
- pawn river-crossing logic;
- practical endgames;
- fortress recognition;
- converting material advantage;
- defensive resources.

Use compact, playable positions with clear success criteria.

---

## P7 — Import/export and study tools

After full-game stability:
- support a practical game notation import/export path;
- preserve FEN and move list;
- add replay/study mode;
- investigate useful open-source Xiangqi parsers already listed in the repo atlas;
- use clean-room adaptation where license compatibility requires it;
- preserve attribution/license files where direct reuse is allowed.

Later candidates:
- image → board recognition;
- opening explorer from public/open game data;
- personal game library;
- study room.

---

## P8 — AI coach quality

Improve the coach only after chess evidence is available.

Coach behavior:
- ask the player what they see before revealing answers;
- explain in natural Vietnamese Xiangqi language;
- compare the player's idea with verified alternatives;
- point to board relationships such as `chân Mã`, `ngòi Pháo`, `đường Xe`, `chiếu Tướng`, `Sĩ Tượng`, `qua sông`, `tranh tiên`;
- avoid numeric engine spam;
- mention engine score only when it helps;
- never pretend certainty beyond evidence.

When the external Experiential key is unavailable, curated fallback must remain useful.

---

# Research instructions

Research is allowed and expected when it improves implementation.

Prioritize:
- official WXF rules;
- official Pikafish docs/source;
- public-domain historical Xiangqi material;
- open datasets and game records with clear rights;
- established Vietnamese/Chinese Xiangqi terminology sources;
- open-source Xiangqi repositories already cataloged in this project.

Search in both Vietnamese and Chinese where relevant.

Useful Chinese queries include combinations of:
- `中国象棋 古谱`
- `象棋 棋谱`
- `象棋 残局`
- `象棋 杀法`
- `象棋 开局`
- `象棋 中局`
- `象棋 残局 定式`
- `橘中秘`
- `梅花谱`
- `适情雅趣`
- `韬略元机`
- `百局象棋谱`

For every important source learned from, record enough provenance to revisit it.

Do not claim to have learned “all lost secrets of Xiangqi.” Build an extensible verified knowledge system instead.

---

# Open-source learning instructions

Use `docs/XIANGQI_OPEN_SOURCE_ATLAS.md` and related repo notes.

Study useful projects for:
- engine adapters;
- rules handling;
- notation;
- game state;
- online play architecture;
- PGN/XQF tooling;
- neural/self-play concepts;
- board recognition;
- review UX.

For each borrowed implementation idea:
- check license;
- preserve attribution if required;
- avoid copying incompatible code;
- prefer reimplementation of architecture/algorithmic ideas where necessary.

---

# UX rules

The owner strongly dislikes robotic copy and confusing interaction.

Beginner UX should always answer:
- whose turn is it?
- which side am I controlling?
- what can I click?
- what happened after my move?
- why is a move illegal?
- what should I think about next?

Use Vietnamese Xiangqi language naturally.

Prefer:
- `ăn quân`
- `bị ăn lại`
- `chiếu Tướng`
- `giải chiếu`
- `chân Mã`
- `ngòi Pháo`
- `qua sông`
- `nước đi`
- `nước đáp`
- `ra Xe`
- `thông Xe`
- `tranh tiên`

Avoid exposing robotic internal wording such as:
- `evidence`
- `retrieval`
- `transfer`
- `candidate move`
- `taxonomy`
- `independent evidence`

---

# Engineering workflow

For each meaningful milestone:

1. inspect current code first;
2. make the smallest coherent architecture change;
3. add/adjust tests;
4. run `npm run quality`;
5. fix every real failure;
6. browser-test the affected user flow when possible;
7. preserve reduced-motion behavior and 2D fallback for 3D work;
8. commit coherent changes;
9. use a feature branch + PR for risky/large changes;
10. merge only after verification;
11. verify Vercel deployment state after merge when access is available;
12. continue to the next milestone automatically.

Never claim browser runtime, engine runtime, CI, merge, or production deployment success unless actually verified.

If GitHub/Vercel automation is unavailable, continue locally and leave a precise handoff with exact failing boundary.

---

# Performance budget

3D must remain practical on ordinary phones/laptops.

Prefer:
- procedural or lightweight GLB assets;
- instancing where useful;
- bounded shadow resolution;
- capped device pixel ratio;
- short animations;
- no unnecessary physics engine;
- no huge textures;
- no cinematic effects that obscure gameplay.

Monitor bundle growth after 3D work.

---

# Security

- Never expose API keys in browser bundles.
- Keep `EXPLABS_API_KEY` server-side only.
- Do not log secrets.
- Do not add arbitrary remote code execution or untrusted script loading.

---

# Definition of meaningful progress

A session is productive only if at least one of these improves:
- full-game playability;
- chess correctness;
- engine integration;
- learning loop quality;
- knowledge coverage with provenance;
- post-game review;
- 3D readability/teaching value;
- natural Vietnamese Xiangqi UX;
- tests/reliability;
- performance/accessibility.

Avoid spending a whole session polishing documentation while gameplay is still missing.

---

# End-of-session handoff

Only when forced to stop by quota/limit/blocker, leave a concise handoff containing:
- current branch/commit;
- what was completed;
- exact tests run and results;
- browser/deployment evidence actually verified;
- current blocker;
- next 3 concrete actions;
- any source/license issue still unresolved.

Then stop. Do not fabricate completion.