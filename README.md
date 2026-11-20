# Vice Panels — GTA-style multi-panel cover maker

[![make.fun competition](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![make.fun rank](https://make.fun/badge/gta6-cover-art-01/Unknown77777777777/gta6-cover-art-01-v2/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![make.fun reward](https://make.fun/badge/gta6-cover-art-01/Unknown77777777777/gta6-cover-art-01-v2/reward.svg)](https://make.fun/c/gta6-cover-art-01)

Vice Panels turns your own photos into a bold multi-panel poster cover in the style of
a Vice City sunset — no uploads, no account, no build step. Open it, drop in photos,
arrange the panels, write a caption, and export a share-ready PNG.

## What it does

- **Your photos, your machine.** Photos are read locally in the browser and never uploaded.
- **Four panel layouts.** Solo, Duo split, Trio (hero + two), and Quad grid — one photo can
  fill several panels at different zooms for a comic-strip look.
- **Crop and position per panel.** Click a panel to select it, drag it on the preview to
  reposition, scroll to zoom, or use the sliders for zoom and shift.
- **Captions that pop.** A big italic title plus subtitle, top or bottom banner, in a
  heavy system-font stack with a hard offset shadow.
- **Four colour grades.** Sunset Vice, Neon Nights, Palm Dusk, and Mono Noir — each with its
  own sky gradient, banner, and accent.
- **Three export sizes.** Square 1080 × 1080, portrait 1080 × 1350, and wide 1920 × 1080,
  exported as PNG with one click.
- **Shareable setups.** The page reads `?photo=`, `?layout=`, `?grade=`, `?title=`, and
  `?size=` from the URL, so a setup can be deep-linked.

## How to use it

1. Serve `app/` with any static server (for example `node serve.ts` in a dev copy, or
   `python3 -m http.server` inside `app/`), then open it in desktop Chrome.
2. Add your photos, or try the two bundled samples.
3. Pick a layout, assign photos to panels, drag and zoom each panel into place.
4. Write your title and subtitle, pick a grade and an export size.
5. Hit **Export PNG** — the file downloads straight from your browser.

## Run it

```sh
# from the app/ folder
python3 -m http.server 8080
# open http://localhost:8080 in Chrome
```

Everything under `app/` is plain static files — HTML, CSS, and one JavaScript module —
with no network requests at all. The two sample photos in `app/samples/` were made with
an image model for make.fun and are free to use.

## Originality

Vice Panels is an original design. It uses no game artwork, characters, logos,
wordmarks, or fonts — only system fonts, CSS effects, and canvas-drawn shapes
(gradients, a striped sun, panel frames).

## License

MIT — see [LICENSE](LICENSE).
