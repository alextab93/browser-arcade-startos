<p align="center">
  <img src="icon.svg" alt="Browser Arcade Logo" width="21%">
</p>

# Browser Arcade on StartOS

Browser Arcade is a first-party static launcher that bundles seven MIT-licensed browser games in one StartOS package. The launcher, games, licenses, fonts, images, and audio are served locally.

## Quick start (StartOS)

Install Browser Arcade from the start9.tabordalab.com (TabordaLab StartOS registry), or sideload the `.s9pk` package.

<img width="1419" height="527" alt="image" src="https://github.com/user-attachments/assets/38d7f4f6-73e2-4b8d-a855-b00aa41f852f" />

## Table of Contents

- [Package identity](#package-identity)
- [Architecture](#architecture)
- [Image and container runtime](#image-and-container-runtime)
- [Game catalog and source locks](#game-catalog-and-source-locks)
- [Volume and data layout](#volume-and-data-layout)
- [Installation and first run](#installation-and-first-run)
- [Network access and interfaces](#network-access-and-interfaces)
- [Actions](#actions)
- [Backups and restore](#backups-and-restore)
- [Health checks](#health-checks)
- [Dependencies](#dependencies)
- [Security and offline design](#security-and-offline-design)
- [Limitations](#limitations)
- [Updating vendored games](#updating-vendored-games)
- [Build and test](#build-and-test)
- [What is unchanged from upstream](#what-is-unchanged-from-upstream)
- [Quick reference for AI consumers](#quick-reference-for-ai-consumers)

## Package identity

| Field | Value |
| --- | --- |
| Repository | `browser-arcade-startos` |
| StartOS package ID | `browser-arcade` |
| Display title | Browser Arcade |
| First-party license | MIT |
| Registry category | Games, assigned in registry metadata rather than the package manifest |

Browser Arcade and its StartOS wrapper live in this repository. The games are vendored components, not a separate Browser Arcade upstream project or submodule. Because the current manifest requires an upstream repository, `upstreamRepo` and `packageRepo` intentionally identify this same repository.

## Architecture

The StartOS daemon runs one Nginx subcontainer. Nginx serves the launcher and vendored assets on port 80. Gameplay executes in the user's browser, so there is no database, game server, account service, or server-side simulation.

## Image and container runtime

The Dockerfile builds from the official Alpine-based Nginx image pinned by immutable multi-architecture digest in `Dockerfile`. It supports x86_64 and aarch64. The build copies only the local Nginx configuration, launcher, game files, and preserved licenses. It performs no network fetch and installs no runtime package.

The image uses Nginx's normal entrypoint. Static application and license files have write permission removed. The current SDK exposes read-only controls for mounts but not a compatible read-only root-filesystem flag for this subcontainer, so no unsupported setting is declared.

## Game catalog and source locks

| Game | Genre | Source record | Input |
| --- | --- | --- | --- |
| 2048 | Puzzle | 2048 | Keyboard, touch |
| Radius Raid | Shooter | Radius Raid | Keyboard, mouse |
| BrickIt | Arcade | HTML5 Games by tvanas | Keyboard, touch |
| BounceIt | Arcade | HTML5 Games by tvanas | Keyboard, touch |
| FloodIt | Puzzle | HTML5 Games by tvanas | Mouse, touch |
| SweepIt | Puzzle | HTML5 Games by tvanas | Mouse, touch |
| SnakeIt | Arcade | HTML5 Games by tvanas | Keyboard, touch |

Exact repositories, immutable commits, license paths, and vendored paths live in `games.lock.json`. `THIRD_PARTY_NOTICES.md` is generated from that lock. The asset review and minimal offline patches are recorded under `third_party/`.

## Volume and data layout

The package declares zero StartOS volumes because the service has no server-side data. Game progress and high scores use each browser's local storage. Clearing browser storage or using another hostname, device, or browser profile can produce a separate or empty save state.

## Installation and first run

The service requires no setup wizard or credentials. After it starts, open the Web Interface and choose a game. The launcher provides search, genre filtering, input badges, controls, normal Play links, fullscreen actions where supported, and local license information.

## Network access and interfaces

| Interface | Protocol | Container port | Purpose |
| --- | --- | --- | --- |
| `ui` | HTTP | 80 | Launcher, games, licenses, and static assets |

StartOS terminates external TLS and routes the exported hostname to this interface. The application does not proxy traffic and has no resolver or external service requirement.

## Actions

None. Browser Arcade needs no configuration, credential, import, or maintenance action.

## Backups and restore

The backup export is valid but contains no volumes. Browser-local scores and saves are outside StartOS and are not included in package backups or restore operations.

## Health checks

The daemon readiness check observes whether port 80 is listening. Nginx also exposes `/healthz`, which returns a plain-text successful response for direct runtime validation.

## Dependencies

None. Nginx is part of the package image and is not a separate StartOS dependency.

## Security and offline design

- Nginx disables directory listing and returns a real 404 for missing game assets.
- The launcher uses a strict Content Security Policy.
- Game paths receive the inline script and style allowance required by the audited legacy games. No game receives `unsafe-eval`.
- Static audits reject remote runtime references and missing local assets.
- Browser tests block non-local requests in Chromium and Firefox.
- There are no ads, trackers, analytics, uploads, secrets, external APIs, CDNs, or remote fonts.
- Access is controlled by the user's StartOS and network exposure choices. Browser Arcade has no application password.

An idle StartOS snapshot on August 13, 2026 observed 0.000 CPU-seconds over five seconds, 108 MiB of container memory, 3,142 KiB of static files, and zero received or transmitted bytes during the sample. These figures describe one x86_64 server and can vary with StartOS, architecture, Nginx worker count, and traffic.

## Limitations

1. Scores and saves are browser-local and are not synchronized or backed up by StartOS.
2. Clearing browser storage resets local progress.
3. Different hostnames can have separate local storage.
4. Gamepad support is not guaranteed.
5. Older games can behave differently across browsers.
6. Radius Raid requires particular attention during Firefox and non-Chromium compatibility testing.
7. There are no accounts, multiplayer services, server-side saves, custom game uploads, ROM support, or Internet-required features.
8. Fullscreen availability and behavior depend on the browser and device.

## Updating vendored games

Updates are deliberate and never merged automatically. For each source update:

1. Select and check out an immutable upstream commit.
2. Review repository and per-directory licenses, assets, fonts, audio, images, imported libraries, runtime links, analytics, advertisements, and external APIs.
3. Replace the corresponding vendored subtree while preserving its layout.
4. Record minimal required modifications in `third_party/PATCHES.md`.
5. Update `games.lock.json`, local license files, and the asset audit.
6. Run `node scripts/generate-notices.mjs`.
7. Run all catalog, license, network, local-asset, offline, browser, and package checks.
8. Review the resulting package on StartOS before release.

## Build and test

From the package repository inside a current StartOS workspace:

```sh
npm ci
npm run check
npm run format:check
npm test
make x86
make arm
```

`npm run audit` runs the catalog, license, runtime-network, and local-asset gates. The browser suite launches all seven games in Chromium and Firefox and rejects non-local requests. The release gate requires clean architecture builds and final StartOS installation checks.

## What is unchanged from upstream

Game engines, rules, controls, local score behavior, directory structures, visual assets, and audio remain upstream code and content. The small recorded patches remove outbound runtime links, replace one missing local icon reference, and preserve offline behavior. Browser Arcade adds the launcher, package integration, static-server policy, license UI, audits, tests, and documentation.

## Contributing

Follow [.ai-workspace/AGENTS.md](.ai-workspace/AGENTS.md) and update every source lock, license, notice, audit record, and offline test when changing vendored content.

## Quick Reference for AI Consumers

```yaml
package_id: browser-arcade
architectures: [x86_64, aarch64]
volumes: {}
ports:
  ui: 80
dependencies: none
startos_managed_env_vars: []
actions: []
data_location: browser_local_storage
```
