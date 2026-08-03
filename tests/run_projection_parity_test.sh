#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "${ROOT_DIR}"

echo "The legacy Python/R projection parity pipeline was removed on this branch."
echo "Running the remaining fixture-based processor regression test instead..."

python -m pytest tests/test_processors.py "$@"

echo "Processor regression test passed."
