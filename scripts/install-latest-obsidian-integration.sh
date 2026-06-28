#!/usr/bin/env bash
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-DioniSilva/mcp_servers}"
SERVER="obsidian-integration"
PACKAGE_NAME="obsidian-integration-mcp-server"
TAG_PREFIX="${SERVER}-v"

usage() {
  cat <<'USAGE'
Install or update the latest obsidian-integration MCP server release.

Usage:
  scripts/install-latest-obsidian-integration.sh

Environment:
  GITHUB_REPOSITORY  Optional owner/repo override. Defaults to DioniSilva/mcp_servers.
  GH_TOKEN           Optional token for private repositories or higher API limits.
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_command node
require_command npm

api_json() {
  local url="$1"

  if command -v gh >/dev/null 2>&1; then
    GH_REPO="$REPO" gh api "$url"
    return
  fi

  require_command curl

  if [[ -n "${GH_TOKEN:-}" ]]; then
    curl -fsSL \
      -H "Accept: application/vnd.github+json" \
      -H "Authorization: Bearer ${GH_TOKEN}" \
      "https://api.github.com${url}"
  else
    curl -fsSL \
      -H "Accept: application/vnd.github+json" \
      "https://api.github.com${url}"
  fi
}

latest_tag="$(
  api_json "/repos/${REPO}/releases?per_page=100" |
    node -e '
      const fs = require("node:fs");
      const releases = JSON.parse(fs.readFileSync(0, "utf8"));
      const prefix = process.argv[1];

      const parse = (tag) => {
        const version = tag.slice(prefix.length);
        const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
        return match ? match.slice(1, 4).map(Number) : null;
      };

      const candidates = releases
        .filter((release) => !release.draft && release.tag_name?.startsWith(prefix))
        .map((release) => ({ tag: release.tag_name, semver: parse(release.tag_name) }))
        .filter((release) => release.semver);

      candidates.sort((left, right) => {
        for (let index = 0; index < 3; index += 1) {
          if (left.semver[index] !== right.semver[index]) {
            return right.semver[index] - left.semver[index];
          }
        }
        return right.tag.localeCompare(left.tag);
      });

      if (!candidates[0]) {
        process.exit(1);
      }

      console.log(candidates[0].tag);
    ' "$TAG_PREFIX"
)"

version="${latest_tag#"$TAG_PREFIX"}"
asset="${PACKAGE_NAME}-${version}.tgz"
url="https://github.com/${REPO}/releases/download/${latest_tag}/${asset}"

echo "Installing ${PACKAGE_NAME} ${version} from ${latest_tag}"
npm install -g "$url"

echo "Installed ${PACKAGE_NAME} ${version}."
echo "Use the MCP command: obsidian-integration-mcp"
