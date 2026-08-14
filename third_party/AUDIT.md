# Vendored Source Audit

## Scope and result

The pinned revisions recorded in `games.lock.json` were reviewed across source code, HTML, stylesheets, fonts, audio, images, sprites, imported libraries, runtime links, analytics, advertising, and external APIs.

All three repositories contain explicit MIT license grants. Their original license texts are preserved in this directory. No NC, ND, all-rights-reserved, ROM, commercial artwork, advertising SDK, analytics client, tracker, or external API dependency was found in the shipped runtime files.

2048 bundles Clear Sans webfont files inside its own source tree. Radius Raid generates audio locally with its bundled JSFXR code. BrickIt includes local MP3 and Ogg effects, while the other tvanas games use local images or generated canvas graphics.

The network audit identified historical outbound links and a Google Fonts stylesheet in upstream files. The changes in `PATCHES.md` remove those runtime references without changing game mechanics. Automated audits enforce local assets, immutable source records, notice consistency, and the absence of remote runtime resources.
