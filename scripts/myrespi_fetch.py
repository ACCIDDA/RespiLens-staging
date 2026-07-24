"""Fetch the documents required for MyRespiLens data conversion."""

import logging
import shutil
from pathlib import Path

logger = logging.getLogger(__name__)


def myrespi_fetch(hub_path: str, folder_name: str, output_path: str) -> None:
    """
    Given hub path, fetch locations.csv and time-series.csv/.parquet.
    Store in output_path/myrespi/<folder_name>
    """
    hub = Path(hub_path)
    destination_dir = Path(output_path) / "myrespi" / folder_name

    # find locations.csv; require that it is there
    locations_file = hub / "auxiliary-data" / "locations.csv"
    if not locations_file.is_file():
        raise FileNotFoundError(f"Missing required file: {locations_file}")

    # find time-series (.csv or .parquet); require that it is there
    target_dir = hub / "target-data"
    ts_csv = target_dir / "time-series.csv"
    ts_parquet = target_dir / "time-series.parquet"
    if ts_csv.is_file():
        time_series_file = ts_csv
    elif ts_parquet.is_file():
        time_series_file = ts_parquet
    else:
        raise FileNotFoundError(
            f"Missing required time-series file (.csv or .parquet) in: {target_dir}"
        )

    # prepare safe landing at destination
    destination_dir.mkdir(parents=True, exist_ok=True)
    # send files to destination
    shutil.copy2(locations_file, destination_dir / locations_file.name)
    shutil.copy2(time_series_file, destination_dir / time_series_file.name)

    logger.info(f"Success ✅")