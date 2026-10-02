#!/usr/bin/env sh
# Replace the site's public URL in every SEO file (canonical, Open Graph, JSON-LD, sitemap, robots).
#
# Usage:   ./scripts/set-domain.sh https://www.your-domain.com
# Example: ./scripts/set-domain.sh https://www.ai-ecommerce-operator.com
#
# Run it from anywhere; it works on the repository root. Safe to run several times.
set -eu

if [ $# -ne 1 ]; then
  echo "Usage: $0 https://your-domain.com" >&2
  exit 1
fi

NEW=$(printf '%s' "$1" | sed 's#/*$##')
case "$NEW" in
  https://*) ;;
  *) echo "Error: the URL must start with https://" >&2; exit 1 ;;
esac

ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"

# Current base URL = canonical URL of index.html, without the trailing slash.
OLD=$(sed -n 's#.*rel="canonical" href="\([^"]*\)".*#\1#p' index.html | head -n 1 | sed 's#/*$##')
if [ -z "$OLD" ]; then
  echo "Error: could not find the canonical URL in index.html" >&2
  exit 1
fi
if [ "$OLD" = "$NEW" ]; then
  echo "Nothing to do: the site URL is already $NEW"
  exit 0
fi

for f in index.html privacy.html terms.html sitemap.xml robots.txt; do
  # '|' as the sed delimiter because URLs contain '/'
  sed -i.bak "s|$OLD|$NEW|g" "$f" && rm -f "$f.bak"
done

echo "Site URL changed:"
echo "  $OLD"
echo "  -> $NEW"
