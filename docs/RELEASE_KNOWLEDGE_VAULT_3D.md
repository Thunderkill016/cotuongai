# Knowledge Vault + Animated 3D release

Production milestone after PR #7.

- Added a provenance-aware Vietnamese/Chinese Xiangqi source registry.
- Separated public-domain historical scans, reference-only modern theory and reconstructed/lost works.
- Added tests for source identity, rights boundaries, bilingual search and knowledge-domain coverage.
- Added the Knowledge Vault ingest doctrine: metadata/edition/rights -> normalized position -> deterministic legality -> Pikafish verification -> newly authored Vietnamese teaching copy.
- Switched the default Three.js board to the enhanced battlefield renderer.
- Added animated movement from origin to destination, piece-specific motion weight/arc, destination impact ring, pulsing legal-move markers and battlefield banners.
- Preserved deterministic rules/engine state and the 2D accessibility/fallback board.

Verification before merge: TypeScript PASS, 44/44 tests PASS, Prettier PASS, production build and Pikafish asset preparation PASS.
