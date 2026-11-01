#!/bin/sh
# Regenerates prooftell.postman_collection.json from the public spec (../../api/openapi.yaml). Run from this folder:
#   sh build.sh
# openapi-to-postmanv2 converts the spec; postprocess.js then shapes the result (see its header). Needs node and npx.
set -eu
cd "$(dirname "$0")"
SPEC=../../api/openapi.yaml
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
npx -y -p js-yaml js-yaml "$SPEC" > "$TMP/openapi.json"
npx -y openapi-to-postmanv2@6 -s "$SPEC" -o "$TMP/raw.json" -p \
  -O folderStrategy=Tags,parametersResolution=Example,includeAuthInfoInExample=false
node postprocess.js "$TMP/raw.json" "$TMP/openapi.json" prooftell.postman_collection.json
