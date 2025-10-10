#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SAMPLE_DIR="${ROOT_DIR}/tests/samples/flusight"
PY_OUTPUT_DIR="${ROOT_DIR}/tests/output/python"
R_OUTPUT_DIR="${ROOT_DIR}/tests/output/r"

rm -rf "${PY_OUTPUT_DIR}" "${R_OUTPUT_DIR}"
mkdir -p "${PY_OUTPUT_DIR}" "${R_OUTPUT_DIR}"

python "${ROOT_DIR}/scripts/external_to_projections.py" \
  --output-path "${PY_OUTPUT_DIR}" \
  --pathogen flu \
  --data-path "${SAMPLE_DIR}/forecast_data.csv" \
  --target-data-path "${SAMPLE_DIR}/target_data.csv" \
  --locations-data-path "${SAMPLE_DIR}/locations.csv" \
  --overwrite

Rscript "${ROOT_DIR}/scripts/external_to_projections.R" \
  --output-path "${R_OUTPUT_DIR}" \
  --pathogen flu \
  --data-path "${SAMPLE_DIR}/forecast_data.csv" \
  --target-data-path "${SAMPLE_DIR}/target_data.csv" \
  --locations-data-path "${SAMPLE_DIR}/locations.csv" \
  --overwrite

ROOT_DIR="${ROOT_DIR}" python - <<'PY'
import json
from pathlib import Path
import sys
import os

root = Path(os.environ["ROOT_DIR"])
py_dir = root / "tests" / "output" / "python" / "flusight"
r_dir = root / "tests" / "output" / "r" / "flusight"

def load(path: Path) -> dict:
    with path.open() as handle:
        return json.load(handle)

def compare_payload(filename: str) -> None:
    py_data = load(py_dir / filename)
    r_data = load(r_dir / filename)
    if py_data != r_data:
        raise AssertionError(f"Payload mismatch for {filename}")

compare_payload("CA_flusight.json")

py_meta = load(py_dir / "metadata.json")
r_meta = load(r_dir / "metadata.json")
py_meta.pop("last_updated", None)
r_meta.pop("last_updated", None)
if py_meta != r_meta:
    raise AssertionError("Metadata mismatch after removing last_updated")
PY

echo "Python and R outputs match for sample flu dataset (metadata timestamps ignored)."
