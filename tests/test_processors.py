import json
import sys
import datetime
from pathlib import Path

import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT / "scripts"))

from external_data import load_inputs
from processors import FlusightDataProcessor, FluMetrocastDataProcessor


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

    actual = _sanitize(processor.output_dict["CA_flu.json"])
    expected = _sanitize(_load_expected("CA_flu.json"))
    assert actual == expected

    actual_meta = _sanitize(processor.output_dict["metadata.json"])
    expected_meta = _sanitize(_load_expected("metadata.json"))
    assert actual_meta["models"] == expected_meta["models"]
    assert actual_meta["locations"] == expected_meta["locations"]


@pytest.mark.parametrize("include_current_forecast", [True, False])
def test_metrocast_uses_current_hub_locations(include_current_forecast):
    rows = [
        ("ogden", datetime.date(2026, 10, 7), "retired-model"),
        ("mesa", datetime.date(2025, 11, 12), "old-model"),
    ]
    if include_current_forecast:
        rows.append(("denver", datetime.date(2026, 10, 7), "current-model"))
    forecasts = pd.DataFrame([
        {
            "location": location, "reference_date": reference_date,
            "target": "wk inc flu hosp", "model_id": model,
            "horizon": 0, "output_type": "quantile", "output_type_id": 0.5,
            "value": 42, "target_end_date": datetime.date(2026, 10, 10),
        }
        for location, reference_date, model in rows
    ])
    locations = pd.DataFrame([
        {"location": "denver", "original_location_code": "688",
         "location_name": "Denver, CO", "population": 2973329},
        {"location": "mesa", "original_location_code": "711",
         "location_name": "Mesa, CO", "population": 299744},
    ])
    truth = pd.DataFrame([
        {"location": location, "target": "wk inc flu hosp",
         "as_of": "2026-10-14", "target_end_date": "2026-10-10",
         "observation": 40}
        for location in ["denver", "ogden"]
    ])

    processor = FluMetrocastDataProcessor(forecasts, locations, truth)
    metadata = processor.output_dict["metadata.json"]

    if include_current_forecast:
        assert set(processor.output_dict) == {"metadata.json", "denver_flu_metrocast.json"}
        assert metadata["models"] == ["current-model"]
        assert [loc["abbreviation"] for loc in metadata["locations"]] == ["denver"]
        payload = processor.output_dict["denver_flu_metrocast.json"]
        assert payload["metadata"]["location"] == "688"
        assert payload["metadata"]["population"] == 2973329
        assert payload["ground_truth"] == {
            "dates": ["2026-10-10"], "wk inc flu hosp": [40]
        }
        prediction = payload["forecasts"]["2026-10-07"]["wk inc flu hosp"]["current-model"]
        assert prediction["predictions"]["0"] == {
            "date": "2026-10-10", "quantiles": [0.5], "values": [42]
        }
    else:
        assert set(processor.output_dict) == {"metadata.json"}
        assert metadata["models"] == []
        assert metadata["locations"] == []

    # Filtering does not mutate the caller's forecasts or location table.
    assert "ogden" in set(forecasts["location"])
    assert set(locations["location"]) == {"denver", "mesa"}
