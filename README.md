# Vice Panels

![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)
![rank](https://make.fun/badge/gta6-cover-art-01/Unknown77777777777/gta6-cover-art-01-v2/rank.svg)
![reward](https://make.fun/badge/gta6-cover-art-01/Unknown77777777777/gta6-cover-art-01-v2/reward.svg)

[View the bounty on make.fun](https://make.fun/bounty/gta6-cover-art-01)

Vice Panels turns your photos into multi-panel cover art in the style of a
Vice City sunset poster: pick up to four photos, arrange them in Solo, Duo,
Trio or Quad panels, write a bold caption, pick a colour grade, and export a
PNG ready to post.

## What it does

- **Your photos, on your machine** — load photos from a file picker, or start
  with the two built-in sample photos (`app/samples/`). Nothing is uploaded.
- **Four panel layouts** — Solo (1 big panel), Duo (2), Trio (1 large + 2
  stacked), Quad (2&times;2). Click a panel to select it, drag to move its
  photo, scroll to zoom, or use the per-panel zoom slider.
- **Editable caption** — title + subtitle, top or bottom, in heavy poster
  lettering (system fonts only) with a black outline and drop shadow.
- **Four colour grades** — Sunset Vice (orange-pink), Neon Nights
  (magenta/cyan), Palm Dusk (purple-teal) and Mono Noir (high-contrast
  black &amp; white), applied to the panels and the caption accent.
- **Live preview** — the cover redraws instantly as you edit.
- **Three export sizes** — 1080&times;1080, 1080&times;1350 and
  1920&times;1080 PNG, rendered on canvas, no network needed.
- **Deep links** — the URL carries the state
  (`?layout=&grade=&title=&subtitle=&pos=&size=&photo=`), so a cover setup
  can be shared as a link.

## Run it

The app is plain static files under `app/` — no build step, no dependencies,
no network requests. Serve the folder with any static server and open it:

```sh
python3 -m http.server 8080 --directory app
# open http://localhost:8080
```

or with Node:

```sh
node --run serve 2>/dev/null || npx --yes serve app
```

## Hand it in

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored make.fun
library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Notes

Vice Panels is an original design. It is not affiliated with Rockstar Games
and uses no Rockstar logos, artwork, characters or fonts. The two sample
photos were made with an image model for make.fun and are free to use.
