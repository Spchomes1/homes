#!/usr/bin/env bash
# Build the .docx and .pdf for an agreement markdown file.
#   ./build.sh ../3011-harlan-dr-consultation-fee-agreement.md
set -euo pipefail

MD="${1:?usage: build.sh <agreement.md>}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MD="$(cd "$(dirname "$MD")" && pwd)/$(basename "$MD")"
BASE="${MD%.md}"

[ -d "$HERE/node_modules/docx" ] || (cd "$HERE" && npm install)

node "$HERE/build_agreement.js" "$MD" "$BASE.docx"
node "$HERE/build_html.js"      "$MD" "$BASE.html"

# Chromium prints the PDF. Falls back through the usual install locations.
CHROME=""
for c in "${CHROME_BIN:-}" /opt/pw-browsers/chromium-*/chrome-linux/chrome \
         "$(command -v chromium || true)" "$(command -v chromium-browser || true)" \
         "$(command -v google-chrome || true)" \
         "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; do
  [ -n "$c" ] && [ -x "$c" ] && CHROME="$c" && break
done

if [ -n "$CHROME" ]; then
  "$CHROME" --headless --no-sandbox --disable-gpu --no-pdf-header-footer \
            --print-to-pdf="$BASE.pdf" "$BASE.html" 2>/dev/null
  echo "wrote $BASE.pdf"
  rm -f "$BASE.html"
else
  echo "no Chromium found — kept $BASE.html, print it to PDF by hand" >&2
fi
