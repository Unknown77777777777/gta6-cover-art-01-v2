# Vice Panels — GTA-style cover art maker

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Unknown77777777777/gta6-cover-art-01-v2/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Unknown77777777777/gta6-cover-art-01-v2/reward.svg)](https://make.fun/c/gta6-cover-art-01)

Vice Panels turns your photos and a caption into poster-style cover art in the
spirit of GTA 6's posters — a multi-panel poster look, big bold caption
lettering, and a Vice City sunset or neon colour grade — and exports it as a
PNG to share.

## What it does

- **Any photo:** add photos from your machine (or drop them on the preview),
  or start with the two bundled sample photos. Fill several panels with one
  photo or several, crop and position each by dragging, scrolling to zoom, or
  with the zoom slider.
- **Multi-panel layouts:** Hero + duo, Triptych, Four squares, Banner + duo.
- **Caption:** edit the big title and subtitle live; pick Sunset, Neon or
  White lettering.
- **Colour grades:** Sunset, Neon, Noir, or Original.
- **Fast and easy:** photo → caption → one tap exports a PNG in the common
  post sizes 1080 × 1080, 1080 × 1350, or 1920 × 1080, with a live preview
  in the editor.

## Run it

Static files under `app/`, no build step, no network request. Serve them with
any static server, e.g. `node serve.ts`, then open http://localhost:8080 in
desktop Chrome. Photos are read on your machine and never uploaded.

## Originality

Vice Panels is original work: no Rockstar Games logo, wordmark, official
artwork, character, or game font. Lettering is drawn with system fonts, and
the sample photos in `app/samples/` were made with an image model for
make.fun.

## Hand in

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to `/output` (or `$MAKEFUN_OUTPUT_DIR`) and writes `dossier.json` with the
vendored make.fun library.

## License

MIT — see [LICENSE](LICENSE).
