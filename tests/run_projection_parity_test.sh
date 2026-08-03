#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "${ROOT_DIR}"

ROOT_DIR="${ROOT_DIR}" python - <<'PY'
import json
import os
import sys
from pathlib import Path

root = Path(os.environ["ROOT_DIR"])
sys.path.append(str(root / "scripts"))

from external_data import load_inputs
from processors import FlusightDataProcessor


def load_expected(filename: str) -> dict:
    path = root / "tests" / "samples" / "expected" / filename
    with path.open() as handle:
        return json.load(handle)


def canonicalize_numbers(obj):
    if isinstance(obj, dict):
        return {key: canonicalize_numbers(value) for key, value in obj.items()}
    if isinstance(obj, list):
        return [canonicalize_numbers(value) for value in obj]
    if isinstance(obj, float):
        return int(obj) if obj.is_integer() else round(obj, 10)
    return obj


def sanitize(payload: dict) -> dict:
    payload = json.loads(json.dumps(payload))
    metadata = payload.get("metadata", {})
    metadata.pop("last_updated", None)
    return canonicalize_numbers(payload)


base = root / "tests" / "samples" / "flusight"
inputs = load_inputs(
    pathogen="flu",
    data_path=base / "forecast_data.csv",
    target_data_path=base / "target_data.csv",
    locations_data_path=base / "locations.csv",
)

processor = FlusightDataProcessor(
    data=inputs.data,
    locations_data=inputs.locations_data,
    target_data=inputs.target_data,
)

actual = sanitize(processor.output_dict["CA_flu.json"])
expected = sanitize(load_expected("CA_flu.json"))
if actual != expected:
    raise AssertionError("CA_flu.json did not match expected fixture output")

actual_meta = sanitize(processor.output_dict["metadata.json"])
expected_meta = sanitize(load_expected("metadata.json"))
if actual_meta["models"] != expected_meta["models"]:
    raise AssertionError("metadata.json models did not match expected fixture output")
if actual_meta["locations"] != expected_meta["locations"]:
    raise AssertionError(
        "metadata.json locations did not match expected fixture output"
    )
PY

echo "Processor regression test passed."
