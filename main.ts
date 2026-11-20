// Vice Panels v6 entrypoint (Node 22, standard library only).
// The entry is the static web app in app/ next to this file: plain HTML, CSS and one
// JavaScript module, no build step and no network requests. This script hands it in:
// it copies app/ and screenshots/ into the output directory and writes
// /output/dossier.json, the summary the judge reads, using the vendored make.fun
// helper in vendor/makefun-app.ts. Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// Caps matching what the scorer refuses: at most 4 screenshots of 256 KiB each,
// at most 993 files / 48 MiB under app/, and no app/ path over 1000 bytes.
// The dossier only records file names, sizes and hashes, so two runs over the
// same tree produce byte-identical dossier.json.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, DOSSIER_CAPS));
