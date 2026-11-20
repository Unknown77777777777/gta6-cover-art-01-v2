# Vice Panels

Turn your photo into GTA-style multi-panel cover art: pick a layout, crop and position each panel, write a bold caption, pick a sunset, neon or dusk grade, and export a sharp PNG in 1080×1080, 1080×1350 or 1920×1080.

[![Vice Panels on make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/Unknown77777777777/gta6-cover-art-01-v2/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/Unknown77777777777/gta6-cover-art-01-v2/reward.svg)](https://make.fun/c/gta6-cover-art-01)

## How it works

1. Open `app/index.html` in desktop Chrome (or run `node serve.ts` and open http://localhost:8080). No network needed — everything is local.
2. Load your own photos, or start from the two bundled sample photos.
3. Choose a layout (Hero, Quad, Triptych, Single), drag panels to reposition each photo, scroll to zoom, and tune each panel's photo, zoom and rotation.
4. Write the caption, set its size, colour and position; pick a colour grade.
5. Choose an export size and hit **Export PNG** — the cover is drawn on canvas at full resolution.

The app reads query presets for deterministic screenshots: `?photo=pier&caption=Sunset%20Heist&layout=hero&grade=sunset&size=1920x1080&shot=cover`.
