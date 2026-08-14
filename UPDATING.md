# Updating Browser Arcade

Browser Arcade has two independently pinned inputs: the static-server base image in `Dockerfile` and the three vendored game source records in `games.lock.json`.

## Static-server image

1. Select a current stable official Nginx Alpine tag.
2. Confirm its Docker Hub manifest supports linux/amd64 and linux/arm64.
3. Record the immutable multi-architecture digest in the Dockerfile.
4. Build both StartOS architectures and verify the Nginx runtime checks.

## Vendored games

1. Select an immutable commit from the relevant upstream repository.
2. Audit licenses, code, fonts, audio, images, imported libraries, hotlinks, analytics, advertisements, and external APIs.
3. Copy the required source subtree into `app/games/` without a Git submodule.
4. Preserve the upstream license under `third_party/`.
5. Record the source and paths in `games.lock.json`.
6. Record every required local modification in `third_party/PATCHES.md`.
7. Regenerate notices with `node scripts/generate-notices.mjs`.
8. Run `npm test`, clean package builds for both architectures, and StartOS runtime verification.

Third-party updates must not be merged automatically. Each revision needs human license, asset, network, offline, browser, and package review.
