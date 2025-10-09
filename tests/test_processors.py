import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT / "scripts"))

from external_data import load_inputs
from processors import FlusightDataProcessor


def _load_expected(filename: str) -> dict:
    path = Path(__file__).resolve().parent / "samples" / "expected" / filename
    with path.open() as handle:
        return json.load(handle)


def _sanitize(payload: dict) -> dict:
    payload = json.loads(json.dumps(payload))  # deep copy
    metadata = payload.get("metadata", {})
    metadata.pop("last_updated", None)
    return _canonicalize_numbers(payload)


def _canonicalize_numbers(obj):
    if isinstance(obj, dict):
        return {key: _canonicalize_numbers(value) for key, value in obj.items()}
    if isinstance(obj, list):
        return [_canonicalize_numbers(value) for value in obj]
    if isinstance(obj, float):
        return int(obj) if obj.is_integer() else round(obj, 10)
    return obj


def test_flusight_processor_matches_expected():
    base = Path(__file__).resolve().parent / "samples" / "flusight"
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

    actual = _sanitize(processor.output_dict["CA_flusight.json"])
    expected = _sanitize(_load_expected("CA_flusight.json"))
    assert actual == expected

    actual_meta = _sanitize(processor.output_dict["metadata.json"])
    expected_meta = _sanitize(_load_expected("metadata.json"))
    assert actual_meta["models"] == expected_meta["models"]
    assert actual_meta["locations"] == expected_meta["locations"]
