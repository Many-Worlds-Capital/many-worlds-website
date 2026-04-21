#!/bin/sh
# One-shot deploy for website-v2: push to main, then trigger Vercel production build.
# Usage: ./deploy.sh
set -e
cd "$(dirname "$0")"

if [ -n "$(git status --porcelain)" ]; then
  echo "Uncommitted changes. Commit or stash before deploying." >&2
  exit 1
fi

git push origin main
vercel --prod --yes
