// Vice Panels — gta6-cover-art-01 rebuild entry (Node 22, standard library only).
// My rebuild: a multi-panel GTA-style cover maker. This program hands the
// entry in: it copies app/ and screenshots/ from beside this file to /output
// and writes /output/dossier.json with the vendored make.fun library.
// The app itself is plain static files under app/ (index.html + ES modules),
// served offline by any static server, no network request, no Rockstar logo,
// artwork or game font. Outside the grader, MAKEFUN_OUTPUT_DIR stands in
// for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail loudly instead of handing in an empty app: the gate needs index.html.
if (!existsSync(join(here, 'app', 'index.html'))) {
  throw new Error('app/index.html is missing — nothing to hand in');
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// Gate caps from the bounty: only text_max_bytes shapes the dossier bytes;
// the rest refuse an entry the scorer would refuse (over 4 screenshots or
// one over 256 KiB; over 993 files / 48 MiB in app/, or a path over 1000 bytes).
// Screenshots ride along as-is: they are the app's own renders (the cover
// alone, the editor with a sample photo loaded, and covers in other sizes),
// taken with the ?shot= scenes in app/src/shots.js.
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
