# 3D Battlefield MVP

This milestone turns the existing Xiangqi board into a playable 3D presentation layer while keeping deterministic rules as the only legality authority.

- WebGL battlefield is the default board view, with a 2D fallback switch.
- Seven piece types are represented as distinct stylized military units built from procedural geometry: commander, guards, war elephants, cavalry, chariots, cannons and infantry.
- Square selection, legal destinations, tutorial focus, last move and board flip remain wired to the existing game state.
- Orbit/zoom controls are constrained for readability.
- Rendering caps pixel ratio for mobile performance and respects reduced-motion preferences.
- No external 3D model CDN is needed for the first playable version.

Later milestones can replace procedural units with optimized GLB assets without changing the board interaction contract.
