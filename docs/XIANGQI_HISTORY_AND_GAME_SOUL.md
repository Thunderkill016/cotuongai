# Xiangqi history and the game soul

This document exists to prevent the product from becoming a mechanical engine UI with Vietnamese labels. The game must reflect the historical evolution, culture, language and playing habits of Xiangqi.

## 1. Origins are debated

Do not claim that one person definitely invented modern Xiangqi.

Ancient Chinese texts use names such as 象棋 / 象戏 for games that were not necessarily the modern game. A Warring States-era reference to a game called xiangqi does not describe its rules. Northern Zhou emperor Wu's 569 CE `Xiang Jing` described an astronomically themed `xiangxi`, again not demonstrably modern Xiangqi. The popular Han Xin story is a legend and lacks strong archaeological support.

Product implication: present origin stories as stories and hypotheses, not settled facts.

## 2. Tang period: military-game precursors become clearer

Tang literary evidence describes a military-themed board game with horses, commanders, wagons and soldiers. The `Xuanguai Lu` story attributed to Niu Sengru contains a vivid description of pieces moving like military units. This is closer in spirit to later Xiangqi but still should not be treated as a complete modern ruleset.

Product implication: Xiangqi should feel like two armies manoeuvring, not abstract circles moving on coordinates.

## 3. Song dynasty: modern Xiangqi takes shape

Northern/Southern Song evidence is the critical historical turning point. Archaeological finds include complete sets of Xiangqi pieces from Song tombs. By the Song period the familiar military piece system, the river/palace structure and cannon play were established strongly enough that the modern game is recognisable.

The river is not just decoration: it changes pawn and elephant behaviour and gives the board a strong spatial identity. The palaces restrict the generals/advisors. The cannon introduces a uniquely Xiangqi tactical grammar based on screens.

Product implication: tutorials should teach the board as geography — palace, river, files, ranks, fronts — rather than as arbitrary coordinates.

## 4. Ming-Qing: the culture of manuals, openings and attacking art

From the Ming and Qing periods, surviving manuals form a major part of Xiangqi culture. Famous works include `橘中秘` (Secret in the Tangerine / Quất Trung Bí) and `梅花谱` (Plum Blossom Manual / Mai Hoa Phổ). The literature is rich in Central Cannon systems, Same/Opposite Direction Cannons, defensive systems such as Screen Horse, sacrificial attacks and mating compositions.

This era matters because it gives Xiangqi a literary and pedagogical tradition: study is not only about the final engine move but about patterns, names, attacking ideas, positional judgement and memorable compositions.

Product implication: the app should teach named motifs and historical ideas, then compare them with modern engine understanding.

## 5. Modern competitive Xiangqi

Xiangqi became an organised competitive sport with national and international federations, rating/title systems, championships and formal rules. The World Xiangqi Federation was founded in 1993 after an international preparatory period beginning in 1988. In 2009 China's General Administration of Sport formally standardised the English name `Xiangqi` for international promotion.

Product implication: serious players need tournament rules, notation, clock habits, repetition/perpetual-check awareness, opening preparation and post-game analysis — not just puzzles.

## 6. Computer era

Computer Xiangqi progressed from hand-crafted evaluation/search programs to strong alpha-beta engines and then neural-network evaluation. Pikafish, derived from Stockfish, combines high-performance search with NNUE and is one of the strongest widely available modern Xiangqi engines.

Research has also explored reinforcement learning and population-based methods. `JiangJun` studied non-transitivity in Xiangqi and reported Master-level performance in human tests. More recent work shows strong searchless transformer-based agents and Xiangqi-specialised LLMs, but general-purpose LLMs still struggle with board legality and spatial reasoning compared with dedicated systems.

Product implication: use AI in layers:
- deterministic rules = legal truth;
- Pikafish = tactical/positional analysis authority;
- LLM = teacher, historian, explainer, interviewer and personal coach;
- learner model = decides what to practise next.

Never use a general LLM as the chess engine.

## 7. What makes Xiangqi feel like Xiangqi

The product should preserve these qualities:

1. **Fast contact and open lines.** Cannons start active, rooks become dominant once files open, and attacks on the exposed general can begin quickly.
2. **Board geography matters.** Palace and river create asymmetric roles and strong territorial language.
3. **The cannon is culturally and tactically distinctive.** Screen mechanics should be taught visually and sonically.
4. **Horse-leg and elephant-eye blocking create local geometry.** The learner should see why a move fails, not receive only a red error message.
5. **King safety is concrete.** Facing generals, palace confinement and mating nets are central patterns.
6. **Attack and counterattack are culturally prominent.** Classic manuals celebrate active play, sacrifices and mating art.
7. **Endgames are exact.** Material alone is misleading; advisor/elephant structure, pawn river position, cannon screens and king activity create specific theoretical endings.
8. **Notation and language are part of the culture.** Vietnamese users should gradually learn real Xiangqi terms rather than only internal UCI coordinates.

## 8. Product redesign implied by history

The current app should evolve from `trainer + engine panel` into a Xiangqi school and playing hall.

### A. Learn the board as a battlefield
- explain palace and river visually;
- introduce each piece through its military identity and movement idea;
- teach Red/Black orientation and traditional piece characters;
- allow modern icon fallback for beginners.

### B. Play complete games early
A beginner should be able to play a full game against an adaptive AI after the first few basic lessons. The app should not trap users in isolated exercises.

### C. Review only meaningful moments
After a game, identify a small number of moments:
- missed forcing move;
- unsafe capture;
- missed opponent threat;
- opening development problem;
- king-safety mistake;
- endgame technique error.

Turn those moments into delayed review positions.

### D. Historical mode
Use public-domain or legally reusable material to tell the evolution of Xiangqi through positions and ideas:
- early military-game history;
- Song formation of the modern board;
- classic manual motifs;
- development of opening theory;
- modern tournament play;
- engine/AI era.

History should be playable, not a wall of text.

### E. Human-style AI opponents
Do not make difficulty only by lowering engine depth randomly. Build profiles:
- beginner who hangs pieces;
- attacking club player;
- defensive Screen-Horse style;
- cannon-heavy tactical player;
- endgame-focused player.

Profiles may be engine-constrained but should produce recognisable styles and realistic mistakes.

### F. AI coach personality
The coach should speak like a Vietnamese Xiangqi teacher:
- ask what the opponent threatens;
- ask for checks, captures and forcing moves;
- use terms such as ăn quân, chiếu Tướng, ngòi Pháo, chân Mã, ra Xe, tranh tiên;
- introduce advanced vocabulary only when useful;
- compare player's idea with classic motifs and modern engine evidence.

## 9. Research standard

For historical claims prefer, in order:
1. archaeological / academic sources;
2. official Xiangqi organisations and rulebooks;
3. primary historical texts or reputable translations;
4. established specialist Xiangqi literature;
5. community articles only for interpretation or terminology.

Record uncertainty. Do not turn legends into facts.
