#!/usr/bin/env bash
# Generate PWA icons (PNG) from the master SVGs in assets-src/.
# Requires rsvg-convert (librsvg). Run from the repo root:  ./scripts/make-icons.sh
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p public/icons

rsvg-convert -w 192 -h 192 assets-src/icon.svg        -o public/icons/icon-192.png
rsvg-convert -w 512 -h 512 assets-src/icon.svg        -o public/icons/icon-512.png
rsvg-convert -w 512 -h 512 assets-src/icon-maskable.svg -o public/icons/icon-maskable.png

# favicon (svg) straight from the same artwork
cp assets-src/icon.svg public/favicon.svg

echo "Icons written to public/icons/"
ls -la public/icons/
