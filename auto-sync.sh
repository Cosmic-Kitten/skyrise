#!/usr/bin/env bash
set -u

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root" || exit 1

echo "Watching $repo_root for changes..."

while inotifywait -q -r -e close_write,move,create,delete \
  --exclude '(^|/)(\.git|node_modules)(/|$)' \
  "$repo_root" >/dev/null 2>&1; do
  sleep 2
  if [[ -z "$(git status --porcelain)" ]]; then
    continue
  fi

  git add -A
  if git diff --cached --quiet; then
    continue
  fi

  commit_message="Auto-sync $(date '+%Y-%m-%d %H:%M:%S')"
  git commit -m "$commit_message" || continue
  git push origin HEAD
 done
