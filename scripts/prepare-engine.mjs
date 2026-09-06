import {
  existsSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  copyFileSync,
  renameSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "vendor/pikafish");
const target = resolve(root, "public/engine");
const provenance = JSON.parse(
  readFileSync(resolve(root, "vendor/PROVENANCE.json"), "utf8"),
);
const upstream = provenance.pikafish;
const commit = upstream.commit;
const rawBase = `${upstream.repository.replace("github.com", "raw.githubusercontent.com")}/${commit}`;

const upstreamPaths = {
  "pikafish-engine.js": "js/worker/pikafish-engine.js",
  "pikafish-engine.wasm": "js/worker/pikafish-engine.wasm",
  "pikafish-9e20a9a44415.nnue": "nnue/pikafish-9e20a9a44415.nnue",
  "upstream-build.sh": "scripts/build_wasm.sh",
};

function checksum(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

async function ensureUpstreamFile(name) {
  mkdirSync(source, { recursive: true });
  const path = resolve(source, name);
  const expected = upstream.files[name];
  if (!expected) throw new Error(`No checksum recorded for ${name}`);

  if (existsSync(path) && checksum(path) === expected) return path;

  const relative = upstreamPaths[name];
  if (!relative) throw new Error(`No upstream path recorded for ${name}`);
  const url = `${rawBase}/${relative}`;
  console.log(`Fetching verified Pikafish asset: ${name}`);
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok)
    throw new Error(
      `Failed to fetch ${name}: ${response.status} ${response.statusText}`,
    );

  const bytes = Buffer.from(await response.arrayBuffer());
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== expected)
    throw new Error(`Downloaded checksum mismatch: ${name}`);

  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, bytes);
  renameSync(tmp, path);
  return path;
}

for (const name of Object.keys(upstreamPaths)) await ensureUpstreamFile(name);

for (const [name, expected] of Object.entries(upstream.files)) {
  const path = resolve(source, name);
  if (!existsSync(path)) continue;
  const actual = checksum(path);
  if (actual !== expected)
    throw new Error(`Upstream checksum mismatch: ${name}`);
}

const original = readFileSync(resolve(source, "pikafish-engine.js"), "utf8");
const start = original.indexOf("(function(){");
const endMarker = "})();var programArgs=[];";
const end = original.indexOf(endMarker);
const pool = "var pthreadPoolSize=navigator.hardwareConcurrency";
if (start < 0 || end < start || original.split(pool).length !== 2)
  throw new Error("Upstream wrapper changed; inspect before adapting.");
const bridge = readFileSync(resolve(root, "scripts/engine-bridge.js"), "utf8");
// Three pre-created workers cover the engine's two search threads and host needs.
const output = (
  original.slice(0, start) +
  bridge +
  original.slice(end + "})();".length)
).replace(pool, "var pthreadPoolSize=3");
mkdirSync(target, { recursive: true });
writeFileSync(resolve(target, "pikafish-engine.js"), output);
for (const name of ["pikafish-engine.wasm", "pikafish-9e20a9a44415.nnue"])
  copyFileSync(resolve(source, name), resolve(target, name));
copyFileSync(resolve(root, "LICENSE"), resolve(target, "LICENSE.txt"));
writeFileSync(
  resolve(target, "PROVENANCE.json"),
  JSON.stringify(provenance, null, 2),
);
console.log(
  "Pikafish assets verified; bridge generated (2 threads, 32 MiB hash).",
);
