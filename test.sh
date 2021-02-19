#!/usr/bin/env bash

set -euo pipefail

npm pack

pushd $(mktemp -d)

npm install $GITHUB_WORKSPACE/*.tgz

node -e 'console.log(require("@dfinity/rosetta-client"))'

popd
