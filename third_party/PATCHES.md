# Vendored Modifications

Browser Arcade keeps the upstream directory structures and changes only runtime references that conflict with offline operation.

## 2048

The upstream promotional and inspiration links in the game footer are rendered as plain attribution text.

## Radius Raid

The credits button returns to Browser Arcade instead of navigating to js13kgames.com. The unused minified standalone distribution files are not shipped.

## HTML5 Games by tvanas

The remote Google Fonts stylesheets and author links are removed from FloodIt and SweepIt. Those games use the local system sans-serif stack. BrickIt and BounceIt no longer navigate to Twitter from their About regions, and their obsolete browser-error messages contain no external browser download links. BounceIt's missing legacy icon reference uses the bundled game icon.

BrickIt, BounceIt, and SweepIt tolerate modern Android user-agent formats that omit legacy delimiters. BrickIt also starts directly in Mobile Safari instead of requiring obsolete home-screen installation. These changes preserve mobile startup without changing game logic.
