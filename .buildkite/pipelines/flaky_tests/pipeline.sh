#!/usr/bin/env bash

set -euo pipefail

UUID="$(cat /proc/sys/kernel/random/uuid)"
export UUID

node .buildkite/pipelines/flaky_tests/pipeline.js | buildkite-agent pipeline upload
