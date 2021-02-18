#!/usr/bin/env bash

set -euo pipefail

npm pack

pushd $(mktemp -d)

npm install $GITHUB_WORKSPACE/*.tgz

popd
