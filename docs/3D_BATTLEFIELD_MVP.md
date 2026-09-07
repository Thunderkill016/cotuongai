# 3D Battlefield MVP

This milestone turns the existing Xiangqi board into a playable 3D presentation layer while keeping deterministic rules as the only legality authority.

- WebGL battlefield is the default board view, with a 2D fallback switch.
- Seven piece types are represented as distinct stylized military units built from procedural geometry: commander, guards, war elephants, cavalry, chariots, cannons and infantry.
- Square selection, legal destinations, tutorial focus, last move and board flip remain wired to the existing game state.
- Orbit/zoom controls are constrained for readability.
- Rendering caps pixel ratio for mobile performance and respects reduced-motion preferences.
- No external 3D model CDN is needed for the first playable version.

Later milestones can replace procedural units with optimized GLB assets without changing the board interaction contract.

## Readability and interaction hardening — 2026-09-07

- Camera distance fits board edges to the viewport aspect ratio. Dragging or cancelling a pointer does not select a square; a short tap does.
- Selected horses show legal paths and blocked legs. The checked general remains marked from current rules state, including reduced-motion mode. Straight rook/cannon check lines come from rules-generated attacks.
- Animation requires a legal consecutive before/after FEN transition, so mounting or jumping through replay does not invent an animated move. Captured units briefly shrink/fall without remaining interactive.
- Reduced-motion changes are observed at runtime; flags stop moving. WebGL initialization failure renders the existing 2D board with an explicit message.
- Chromium production-build smoke covered 390px framing, camera drag preserving game state, and a forced WebGL failure followed by a legal 2D move and a real Pikafish reply. Reduced-motion view switching also ran. Physical phones and learning/readability comparisons remain unverified.
