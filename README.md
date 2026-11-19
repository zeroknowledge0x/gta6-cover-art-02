# Neon Coast Cover Studio

An offline static web app that turns any three photos and a caption into a multi-panel, GTA-flavoured
poster, exported as a PNG. Everything is drawn with canvas 2D in the browser; there are no libraries,
no font downloads and no network calls of any kind.

## Run

    node serve.ts --port 8080

Open the page the server prints, load one to three photos, type a caption, pick a layout and grade,
adjust each panel's zoom and pan, choose an export size, then press Export PNG. The photos are read
with FileReader-style object URLs and never leave the machine.

## Layouts

- Four panels: a large hero panel over a row of three smaller panels, separated by dark gutters.
- Hero + three: a 60% hero on the left and three stacked panels on the right.
- Full bleed: one photo across the whole canvas with a translucent title strip.

## Grades

Sunset (orange into magenta/violet), Neon (cyan into hot pink), Midnight (indigo into deep teal)
and Bleach (low-opacity warm cream). Every grade is a linear gradient laid over each panel.
A seeded linear-congruential generator adds halftone dots and film grain; a radial vignette,
two bezier palm fronds, a chromatic-aberration caption, an ORIGINAL COVER ribbon and a five-star
heat meter finish the poster. All artwork is original; no official logos, fonts or artwork appear.

## Export

Three sizes are supported: 1080x1080, 1080x1350 and 1920x1080. Changing size resets the canvas
backing store and repaints from `state`, so every coordinate is derived from `canvas.width/height`.
`canvas.toBlob('image/png')` provides the download.

## Determinism

Grain, halftone and every other texture come from a seeded LCG, never `Math.random`, so a given
caption, layout and photo set always produce exactly the same pixels and the same exported PNG.

## Build

    mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

`main.ts` copies `app/` and `screenshots/` and writes `dossier.json` using `buildDossier` from
`vendor/makefun-app.ts`. The dossier is canonical JSON: two runs into different output directories
produce byte-identical files. Screenshots are described in `shots.json` and rendered with the
`?shot=` query hooks in `app/src/shots.js`.
