// Vice Panels v5 — entrypoint for gta6-cover-art-01 (Node 22, stdlib only).
// Hands the entry in: copies this repo's app/ and screenshots/ into the
// output directory and writes dossier.json with the vendored make.fun
// library (vendor/makefun-app.ts, unchanged). Outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output, so a local check looks like:
//   MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (from the kit's reference/gate.json): only
// text_max_bytes shapes the dossier's bytes; the rest refuse an entry the
// scorer would refuse (over 4 screenshots or one over 256 KiB; over 993
// files in app/ or 48 MiB of app files in all; an app/ path over 1000
// bytes). app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json, so the caps below leave room.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function handIn() {
  if (!existsSync(join(repoRoot, 'app', 'index.html'))) {
    throw new Error('app/index.html is missing: nothing to hand in');
  }
  mkdirSync(outDir, { recursive: true });
  // Start from a clean output dir so a stale file can never ship twice.
  // (Only app/ and screenshots/ are cleared: the dir itself may be shared.)
  rmSync(join(outDir, 'app'), { recursive: true, force: true });
  rmSync(join(outDir, 'screenshots'), { recursive: true, force: true });
  cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });
  if (existsSync(join(repoRoot, 'screenshots'))) {
    cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
  }
  writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, DOSSIER_LIMITS));
}

handIn();
