// Vice Panels v7 — the entry program (Node 22, standard library only).
//
// It hands the app in: copies this repository's app/ and screenshots/ into the
// output directory and writes /output/dossier.json with buildDossier from the
// vendored make.fun library. The app itself is plain static files under app/
// (index.html + one ES module + local sample photos), so it runs offline from
// any static file server. Outside the grader, MAKEFUN_OUTPUT_DIR stands in
// for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps mirror the gate so a run that would be refused fails loudly here:
// at most 4 screenshots of 256 KiB each, app/ at most 993 files and 48 MiB,
// no app/ path over 1000 bytes, and the dossier text capped at 160 KiB.
const dossierPath = join(outputDir, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

// One line of proof on stdout: where the entry landed and how big it is, so a
// run that silently wrote nothing is easy to spot in the grader's logs.
console.log(`Vice Panels handed in: ${outputDir} (dossier.json ${statSync(dossierPath).size} bytes)`);
