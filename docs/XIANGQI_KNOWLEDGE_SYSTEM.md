# Xiangqi Knowledge System

## Goal

Build a Xiangqi learning game that makes a player measurably stronger instead of merely exposing them to more content.

The system combines four authorities:

1. **Rules authority** — deterministic Xiangqi rules and official competition rules.
2. **Chess authority** — Pikafish and verified game/position data.
3. **Pedagogy authority** — retrieval practice, spaced review, worked examples, deliberate-practice style tasks and delayed transfer tests.
4. **Language authority** — Vietnamese Xiangqi terminology and prose from the project's Vietnamese corpus/guide.

The LLM is never the source of truth for legal moves, evaluations, or historical claims. It is the coach that selects, sequences and explains verified material.

## Knowledge domains

### 1. Rules and board literacy
- board, river, palace, side to move
- legal movement for Tướng/Sĩ/Tượng/Xe/Pháo/Mã/Tốt
- chân Mã, mắt Tượng, ngòi Pháo
- flying generals
- check, check evasion, mate, stalemate
- repetition/perpetual check/chase boundaries
- notation and game recording

### 2. Tactical vision / sát pháp
- forcing-move scan: chiếu, ăn quân, dọa sát
- loose/hanging pieces
- overloaded defender
- pin/line restriction
- discovered attack
- attraction/deflection
- clearance
- blocking and interposition
- exchange combinations
- sacrifice for attack
- double attack
- mating nets
- classical named motifs such as Mã Hậu Pháo, Thiết Môn Thuyên, Song Xa Thác, Trắc Diện Hổ, Điếu Ngư Mã, Cao Điếu Mã, Ngọa Tào Mã, Thiên Địa Pháo, Nhị Quỷ Phách Môn

### 3. Calculation
- candidate generation
- forcing-move ordering
- opponent best reply
- 1-ply -> 2-ply -> 3-ply calculation
- quiet defensive resources
- branch pruning without wishful thinking
- final blunder check

### 4. Opening / khai cuộc
Teach principles before memorization:
- rapid development / xuất quân
- king safety
- piece coordination
- contesting central files/lanes
- avoiding repeated moves without purpose
- when to open or close lines

Then families and subfamilies:
- Pháo Đầu / Trung Pháo
- Thuận Pháo
- Nghịch/Liệt Pháo
- Bình Phong Mã
- Phản Cung Mã
- Đơn Đề Mã
- Tam Bộ Hổ
- Phi Tượng Cuộc
- Tiên Nhân Chỉ Lộ
- Quá Cung Pháo
- Sĩ Giác Pháo
- Khởi Mã Cuộc
- Uyên Ương Pháo
- Hoành Xa / Tuần Hà Xa / Quá Hà Xa structures

Opening training must ask **why the move works**, not only whether it matches a book line.

### 5. Middlegame / trung cuộc
- evaluate king safety
- material balance
- piece activity
- weak pieces and weak squares/lines
- initiative / tiên thủ
- attack vs defence
- converting development lead
- improving the worst piece
- creating and exploiting targets
- piece coordination
- exchange decisions
- prophylaxis: what does the opponent want?
- transition to favorable endgames

### 6. Endgame / tàn cuộc
- elementary checkmates
- practical theoretical endings
- Xe endings
- Xe + Tốt
- Xe + Mã
- Xe + Pháo
- Pháo/Mã/Tốt endings
- Sĩ/Tượng defensive structures
- Sĩ Tượng toàn, khuyết Sĩ, khuyết Tượng
- drawing fortresses
- zugzwang-like move-order constraints
- converting extra pawn/material
- practical clock-aware endgame decisions

### 7. Classical and modern game study
- Quất Trung Bí
- Mai Hoa Phổ
- representative modern master games
- modern opening theory and engine-refined lines
- annotated games grouped by theme rather than by player only

### 8. Decision discipline
Before every move train this loop:
1. Opponent threat?
2. Checks?
3. Captures?
4. Direct threats?
5. Candidate quiet moves?
6. Opponent strongest reply?
7. Blunder check?

This should become a habit, not a popup the learner ignores.

## Learner model

Never store a single vague `mastery` number. Maintain evidence per skill:

```ts
interface SkillEvidence {
  skillId: string;
  attempts: number;
  firstTrySuccesses: number;
  assistedSuccesses: number;
  failures: number;
  avgThinkMs: number;
  lastSeenAt: number;
  nextReviewAt: number;
  recentErrorKinds: string[];
  transferSuccesses: number;
}
```

Skill estimates must distinguish:
- recognition with hints,
- independent recognition,
- calculation under time,
- transfer to a new position,
- retention after delay.

## Mistake taxonomy

At minimum classify:
- illegal-move misunderstanding
- missed-check
- missed-capture
- missed-mate
- unsafe-capture / recapture blindness
- hanging-piece blunder
- missed-opponent-threat
- calculation-too-shallow
- wrong-candidate-set
- premature-attack
- unnecessary-defence
- bad-exchange
- opening-principle violation
- opening-memory failure
- positional-misread
- endgame-technique error
- time-management error

The classifier should use deterministic rules and engine evidence first. The LLM may convert evidence into an explanation but must not invent the category from unsupported prose.

## AI coach architecture

### Pikafish
Returns:
- best move
- MultiPV alternatives
- score / mate score
- depth, nodes, search time
- principal variations

### Deterministic feature extractor
Derives facts such as:
- capture/check/mate
- attacked pieces
- immediate recaptures
- material change
- king exposure
- legal forcing replies
- opening family if known

### Knowledge retriever
Loads only relevant chunks from:
- rules
- opening principles/lines
- tactical motifs
- endgame rules
- annotated examples
- learner mistake history

### LLM coach
Allowed to:
- ask a question before revealing the answer
- explain engine-backed differences between candidate moves
- choose the next hint
- summarize a recurring weakness
- create a practice plan from verified positions
- translate technical analysis into natural Vietnamese

Not allowed to:
- invent best moves
- invent evaluations
- generate illegal PVs
- claim a learner has mastered a skill without evidence
- fabricate citations or historical facts

## Core learning modes

### Learn
Short concept -> worked position -> guided position -> independent position -> delayed review.

### Tactics
Adaptive motif training. Require a candidate move before engine reveal.

### Play vs AI
Full games with configurable strength. No interruptions during normal play unless learner enables training mode.

### Coach game
At selected decision points:
- user writes/selects 2-3 candidate moves
- coach asks for opponent response
- user commits
- engine analysis appears after commitment

### Review my game
Do not annotate every engine fluctuation. Select only instructive moments:
- blunder
- missed tactic
- important strategic decision
- opening deviation worth learning
- endgame technique moment

For each selected position:
1. hide engine answer
2. ask learner to find candidates again
3. reveal graduated hints
4. compare with original move
5. explain one principle
6. schedule a transformed/similar position for later review

### Today's training
A session planner builds 15–30 minute sessions from:
- due spaced reviews
- current weakest skills
- one new concept
- one transfer task
- optional full/mini game

## Difficulty adaptation

Difficulty is not just engine Elo. Adjust:
- position complexity
- number of plausible candidates
- tactical depth
- hint availability
- time limit
- amount of board clutter
- whether the motif is named
- whether positions come from familiar openings
- engine playing strength

## Knowledge ingestion pipeline

Do not scrape and dump the internet into prompts.

For each source:
1. record title, author/publisher, URL, language, source type, date, license/status
2. extract concepts and terminology, not whole copyrighted books
3. normalize positions into FEN + move list where legally usable
4. verify every move with rules code
5. optionally verify analysis with Pikafish
6. tag by domain, skill, difficulty, opening, motif, phase
7. separate `source claim` from `engine inference` and `editorial explanation`
8. add provenance to every derived lesson

## Source priorities

1. Official federation rules and tournament material.
2. Strong engine official repositories/docs.
3. Public-domain/classical game records and legally reusable databases.
4. Books/course indexes for taxonomy and terminology; do not mirror copyrighted full text.
5. Master-game annotations with provenance.
6. Community material only after cross-checking.

## Product metric

The product is working only if users improve on delayed, unseen positions.

Track:
- first-try accuracy
- hint rate
- recurring mistake rate
- candidate-move quality
- blunders per game
- tactical motif retention after 1/3/7/14 days
- transfer accuracy on new positions
- endgame test accuracy
- opening principle errors
- engine-calibrated game performance trend

Do not optimize for lessons completed, time-on-site, or number of engine lines viewed as primary learning metrics.

## Current implementation priority

1. Close full-game vs AI loop.
2. Expand mistake taxonomy and review-game pipeline.
3. Build source/provenance-aware position schema.
4. Build due-review session planner.
5. Add curated tactical/endgame corpus.
6. Add opening explorer after principles are teachable.
7. Add AI explanations grounded in retrieved knowledge + engine evidence.
8. Only then expand presentation/3D.
