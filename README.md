# Vice Panels — GTA-style Cover Maker

[![LIVE on make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)

Unofficial fan-made web app that turns your own photos and a caption into
multi-panel GTA-style cover art — sunset / neon Vice City grade, bold
lettering, no Rockstar logo, artwork or game font.

## How it works

1. Load a photo from your machine (or a sample) — it fills all 4 panels.
2. Give each panel its own photo, zoom and pan, so one photo can fill
   several panels with different framings, or each panel can hold a
   different photo.
3. Edit the caption and sub-caption, pick a layout (Hero + 3, Four squares,
   Triptych + strip) and a grade (Sunset Vice City, Neon Night, Palm Dusk).
4. Export a PNG in **1080 × 1080**, **1080 × 1350** or **1920 × 1080**.

Photos are read on your machine only — nothing is uploaded, and the app
runs fully offline as static files under `app/`.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and
writes `dossier.json` with `buildDossier` from `vendor/makefun-app.ts`.

## License

MIT — see [LICENSE](LICENSE).
