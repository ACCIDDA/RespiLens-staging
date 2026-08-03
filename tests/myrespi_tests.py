import csv
import unittest
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
MYRESPI_DATA_DIR = ROOT / "app" / "public" / "processed_data" / "myrespi"

STANDARD_LOCATION_COLUMNS = {
    "abbreviation",
    "location",
    "location_name",
    "population",
}

METROCAST_LOCATION_COLUMNS = {
    "location",
    "original_location_code",
    "state",
    "state_abb",
    "location_name",
    "population",
    "location_type",
    "hsa_counties",
}

STANDARD_TIME_SERIES_COLUMNS = {
    "target_end_date",
    "observation",
    "location",
    "as_of",
    "target",
}

METROCAST_TIME_SERIES_COLUMNS = {
    "as_of",
    "location",
    "target",
    "target_end_date",
    "observation",
}

HUB_EXPECTATIONS = {
    "flusight": {
        "locations_file": "locations.csv",
        "locations_columns": STANDARD_LOCATION_COLUMNS,
        "time_series_file": "time-series.csv",
        "time_series_columns": STANDARD_TIME_SERIES_COLUMNS,
    },
    "covid19forecasthub": {
        "locations_file": "locations.csv",
        "locations_columns": STANDARD_LOCATION_COLUMNS,
        "time_series_file": "time-series.parquet",
        "time_series_columns": STANDARD_TIME_SERIES_COLUMNS,
    },
    "rsvforecasthub": {
        "locations_file": "locations.csv",
        "locations_columns": STANDARD_LOCATION_COLUMNS,
        "time_series_file": "time-series.parquet",
        "time_series_columns": STANDARD_TIME_SERIES_COLUMNS,
    },
    "flumetrocast": {
        "locations_file": "locations.csv",
        "locations_columns": METROCAST_LOCATION_COLUMNS,
        "time_series_file": "time-series.csv",
        "time_series_columns": METROCAST_TIME_SERIES_COLUMNS,
    },
}


def read_csv_columns(path: Path) -> set[str]:
    with path.open(newline="") as handle:
        reader = csv.reader(handle)
        return set(next(reader))


def read_tabular_columns(path: Path) -> set[str]:
    if path.suffix == ".csv":
        return read_csv_columns(path)
    if path.suffix == ".parquet":
        return set(pd.read_parquet(path).columns)
    raise ValueError(f"Unsupported file type for test: {path}")


class MyRespiReferenceFileTests(unittest.TestCase):
    def test_expected_reference_files_exist_and_have_required_columns(self):
        for hub_name, expectation in HUB_EXPECTATIONS.items():
            with self.subTest(hub=hub_name, file="locations"):
                locations_path = MYRESPI_DATA_DIR / hub_name / expectation["locations_file"]
                self.assertTrue(locations_path.exists(), f"Missing {locations_path}")

                actual_columns = read_tabular_columns(locations_path)
                missing_columns = expectation["locations_columns"] - actual_columns
                self.assertFalse(
                    missing_columns,
                    f"{hub_name} locations file is missing columns: {sorted(missing_columns)}",
                )

            with self.subTest(hub=hub_name, file="time-series"):
                time_series_path = MYRESPI_DATA_DIR / hub_name / expectation["time_series_file"]
                self.assertTrue(time_series_path.exists(), f"Missing {time_series_path}")

                actual_columns = read_tabular_columns(time_series_path)
                missing_columns = expectation["time_series_columns"] - actual_columns
                self.assertFalse(
                    missing_columns,
                    f"{hub_name} time-series file is missing columns: {sorted(missing_columns)}",
                )


if __name__ == "__main__":
    unittest.main()
