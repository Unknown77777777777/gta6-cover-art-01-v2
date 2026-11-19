// main.ts — Vice Panels entrypoint (Node 22, standard library only).
// Copies app/ and screenshots/ from this repository into the output
// directory and writes dossier.json with the kit's buildDossier.
// Deterministic: files are copied in sorted order and nothing written
// here carries a timestamp or a random value.
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir: string = resolve(dirname(fileURLToPath(import.meta.url)));
const outputDir: string = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

function copyTreeSorted(srcDir: string, dstDir: string): void {
  mkdirSync(dstDir, { recursive: true });
  const entries: string[] = readdirSync(srcDir).sort();
  for (const name of entries) {
    const src = join(srcDir, name);
    const dst = join(dstDir, name);
    if (statSync(src).isDirectory()) {
      copyTreeSorted(src, dst);
    } else {
      writeFileSync(dst, readFileSync(src));
    }
  }
}

function countFiles(dir: string): number {
  let total = 0;
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    total += statSync(p).isDirectory() ? countFiles(p) : 1;
  }
  return total;
}

function main(): void {
  for (const name of ['app', 'screenshots', 'dossier.json']) {
    rmSync(join(outputDir, name), { recursive: true, force: true });
  }
  mkdirSync(outputDir, { recursive: true });
  copyTreeSorted(join(repoDir, 'app'), join(outputDir, 'app'));
  copyTreeSorted(join(repoDir, 'screenshots'), join(outputDir, 'screenshots'));
  const dossier: Uint8Array = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  const appFiles = countFiles(join(outputDir, 'app'));
  const shotFiles = countFiles(join(outputDir, 'screenshots'));
  console.log(`Vice Panels: wrote ${appFiles} app files, ${shotFiles} screenshots, dossier.json (${dossier.length} bytes) to ${outputDir}`);
}

main();
