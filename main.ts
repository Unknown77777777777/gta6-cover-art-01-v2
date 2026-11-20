// Vice Panels entry program (Node 22, standard library only).
//
// The app is plain static files under app/ (index.html plus its ES modules,
// offline, no network request). This program hands the entry in: it copies
// app/ and screenshots/ from beside this file into the output folder and
// writes dossier.json there with the vendored make.fun library.
//
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The repository root is the folder holding this file; the output folder
// comes from MAKEFUN_OUTPUT_DIR and defaults to /output.
const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });

// Copy one tree from the repository into the output folder. The copy is
// byte-for-byte, so two runs of this program write identical folders.
function copyTree(name) {
  const from = join(here, name);
  const to = join(out, name);
  if (name === 'screenshots') mkdirSync(to, { recursive: true });
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

copyTree('app');
copyTree('screenshots');

// The caps below mirror the scorer's own limits, so a folder this program
// writes is one the scorer accepts: at most 4 screenshots of 256 KiB each,
// app/ at most 993 files and 48 MiB in all, no app/ path over 1000 bytes.
// Only text_max_bytes changes the dossier's bytes; the rest only refuse.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
