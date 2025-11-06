"""Utilities for loading and validating external Hubverse datasets."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, Optional, Set
import json
import logging

import pandas as pd

from helper import clean_nan_values, hubverse_df_preprocessor


logger = logging.getLogger(__name__)


class ExternalDataError(ValueError):
    """Raised when user-supplied data fails validation."""


@dataclass(frozen=True)
class ExternalInputs:
    """Container for validated external inputs."""

    data: pd.DataFrame
    target_data: pd.DataFrame
    locations_data: pd.DataFrame


FORECAST_REQUIRED_COLUMNS: Set[str] = {
    "location",
    "reference_date",
    "target",
    "model_id",
    "horizon",
    "output_type",
    "output_type_id",
    "value",
    "target_end_date",
}

PATHOGEN_TARGET_REQUIREMENTS: Dict[str, Set[str]] = {
    "flu": {"as_of", "target_end_date", "location", "observation"},
    "rsvforecasthub": {"as_of", "date", "location", "observation", "target"},
    "covid19forecasthub": {"as_of", "date", "location", "observation", "target"},
}

LOCATION_REQUIRED_COLUMNS: Set[str] = {"location", "abbreviation", "location_name", "population"}


def load_inputs(
    pathogen: str,
    data_path: Path,
    target_data_path: Path,
    locations_data_path: Path,
    *,
    filter_quantiles: bool = True,
    filter_nowcasts: bool = True,
) -> ExternalInputs:
    """Load and validate the three core datasets required to build RespiLens projections."""

    _validate_pathogen(pathogen)

    forecast_df = _load_forecast_data(data_path)
    target_df = _load_target_data(target_data_path, pathogen)
    locations_df = _load_locations_data(locations_data_path)

    _validate_forecast_columns(forecast_df, FORECAST_REQUIRED_COLUMNS, data_path)
    _validate_target_columns(target_df, PATHOGEN_TARGET_REQUIREMENTS[pathogen], target_data_path)
    _validate_location_columns(locations_df, LOCATION_REQUIRED_COLUMNS, locations_data_path)
    _validate_location_coverage(forecast_df, locations_df, data_path, locations_data_path)

    processed_data = hubverse_df_preprocessor(forecast_df, filter_quantiles=filter_quantiles, filter_nowcasts=filter_nowcasts)

    return ExternalInputs(
        data=clean_nan_values(processed_data),
        target_data=clean_nan_values(target_df),
        locations_data=clean_nan_values(locations_df),
    )


def load_projections_schema() -> Dict:
    """Load the RespiLens projections JSON schema."""

    schema_path = Path(__file__).resolve().parent / "schemas" / "RespiLens_projections.schema.json"
    with schema_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def validate_against_schema(payload: Dict, schema: Dict) -> None:
    """Validate a payload against the RespiLens projections schema."""

    try:
        from jsonschema import Draft202012Validator
    except ImportError as exc:  # pragma: no cover - dependency is optional at runtime
        raise ExternalDataError("jsonschema is required to validate outputs. Please install jsonschema.") from exc

    validator = Draft202012Validator(schema)
    errors = sorted(validator.iter_errors(payload), key=lambda e: e.path)
    if errors:
        first_error = errors[0]
        raise ExternalDataError(
            f"Schema validation failed: {first_error.message} at path {list(first_error.path)}"
        )


def _validate_pathogen(pathogen: str) -> None:
    if pathogen not in PATHOGEN_TARGET_REQUIREMENTS:
        raise ExternalDataError(
            f"Unsupported pathogen '{pathogen}'. Supported options are: {list(PATHOGEN_TARGET_REQUIREMENTS)}"
        )


def _load_forecast_data(data_path: Path) -> pd.DataFrame:
    if not data_path.exists():
        raise ExternalDataError(f"Forecast data path does not exist: {data_path}")
    logger.info("Loading forecast data from %s", data_path)
    df = pd.read_csv(data_path, dtype={"location": str})
    return df


def _load_target_data(target_data_path: Path, pathogen: str) -> pd.DataFrame:
    if not target_data_path.exists():
        raise ExternalDataError(f"Target data path does not exist: {target_data_path}")

    logger.info("Loading %s target data from %s", pathogen, target_data_path)
    suffix = target_data_path.suffix.lower()
    if suffix == ".csv":
        df = pd.read_csv(target_data_path, dtype={"location": str})
    elif suffix in {".parquet", ".pq"}:
        df = pd.read_parquet(target_data_path)
        if "location" in df.columns:
            df["location"] = df["location"].astype(str)
    else:
        raise ExternalDataError(
            f"Unsupported target data file extension '{suffix}' for {target_data_path}"
        )
    return df


def _load_locations_data(locations_data_path: Path) -> pd.DataFrame:
    if not locations_data_path.exists():
        raise ExternalDataError(f"Locations data path does not exist: {locations_data_path}")
    logger.info("Loading location metadata from %s", locations_data_path)
    df = pd.read_csv(locations_data_path, dtype={"location": str})
    return df


def _validate_forecast_columns(df: pd.DataFrame, required: Iterable[str], data_path: Path) -> None:
    missing = set(required) - set(df.columns)
    if missing:
        raise ExternalDataError(
            f"Forecast data at {data_path} is missing required columns: {sorted(missing)}"
        )


def _validate_target_columns(df: pd.DataFrame, required: Iterable[str], data_path: Path) -> None:
    missing = set(required) - set(df.columns)
    if missing:
        raise ExternalDataError(
            f"Target data at {data_path} is missing required columns: {sorted(missing)}"
        )


def _validate_location_columns(df: pd.DataFrame, required: Iterable[str], data_path: Path) -> None:
    missing = set(required) - set(df.columns)
    if missing:
        raise ExternalDataError(
            f"Location metadata at {data_path} is missing required columns: {sorted(missing)}"
        )


def _validate_location_coverage(
    forecast_df: pd.DataFrame,
    locations_df: pd.DataFrame,
    forecast_path: Path,
    locations_path: Path,
) -> None:
    known_locations = set(locations_df["location"].astype(str))
    missing_locations = sorted(set(forecast_df["location"].astype(str)) - known_locations)
    if missing_locations:
        raise ExternalDataError(
            "The following locations appear in forecast data but are missing from location metadata: "
            f"{missing_locations}. Forecast file: {forecast_path}, locations file: {locations_path}"
        )
