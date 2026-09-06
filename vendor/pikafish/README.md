# Pikafish runtime cache

The large browser engine artifacts are intentionally not tracked in this repository.

`npm run prepare:engine` downloads the exact files recorded in `../PROVENANCE.json` from the pinned upstream commit, verifies their SHA-256 hashes, caches them in this directory, then generates `public/engine/` for Vite.

Tracked source of truth:

- upstream repository + immutable commit: `vendor/PROVENANCE.json`
- runtime bridge authored by this project: `scripts/engine-bridge.js`
- deterministic transformation: `scripts/prepare-engine.mjs`

The cached `.nnue`, `.wasm`, generated wrapper and generated `public/engine/` are ignored by Git. Public distributors remain responsible for satisfying GPLv3 corresponding-source obligations for the Pikafish binary they ship.
