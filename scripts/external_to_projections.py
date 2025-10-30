"""Convert Hubverse exports into RespiLens projection JSON files."""

from __future__ import annotations

import argparse
import logging
from pathlib import Path
from typing import Dict, Tuple

from external_data import ExternalDataError, load_inputs, load_projections_schema, validate_against_schema
from processors import COVIDDataProcessor, FlusightDataProcessor, RSVDataProcessor
from helper import save_json_file


PROCESSOR_CLASS_MAP: Dict[str, Tuple[type, str]] = {
    "flu": (FlusightDataProcessor, "flu"),
    "rsvforecasthub": (RSVDataProcessor, "rsv"),
    "covid19forecasthub": (COVIDDataProcessor, "covid19"),
}

PATHOGEN_ALIASES = {
    "rsv": "rsvforecasthub",
    "covid": "covid19forecasthub",
}


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert Hubverse data into RespiLens projection JSON.")
    parser.add_argument("--output-path", required=True, help="Directory where JSON files will be written.")
    parser.add_argument(
        "--pathogen",
        required=True,
        help="Pathogen to process (flu, rsvforecasthub, covid19forecasthub).",
    )
    parser.add_argument("--data-path", required=True, help="Absolute path to Hubverse forecast data in CSV format.")
    parser.add_argument(
        "--target-data-path",
        required=True,
        help="Absolute path to Hubverse ground truth target data (CSV or Parquet).",
    )
    parser.add_argument(
        "--locations-data-path",
        required=True,
        help="Absolute path to the location metadata CSV.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing files in the output directory if set.",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Console logging verbosity.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    logging.basicConfig(level=getattr(logging, args.log_level))
    output_path = Path(args.output_path).resolve()

    pathogen_arg = args.pathogen.lower()
    canonical_key = PATHOGEN_ALIASES.get(pathogen_arg, pathogen_arg)
    if canonical_key not in PROCESSOR_CLASS_MAP:
        valid = ", ".join(sorted(PROCESSOR_CLASS_MAP))
        logging.error("Unsupported pathogen '%s'. Choose one of: %s", args.pathogen, valid)
        return 1

    processor_cls, pathogen_key = PROCESSOR_CLASS_MAP[canonical_key]

    try:
        inputs = load_inputs(
            pathogen=canonical_key,
            data_path=Path(args.data_path).resolve(),
            target_data_path=Path(args.target_data_path).resolve(),
            locations_data_path=Path(args.locations_data_path).resolve(),
        )
    except ExternalDataError as exc:
        logging.error("Input validation failed: %s", exc)
        return 1

    logging.info("Starting %s projections processing...", canonical_key.upper())
    processor = processor_cls(
        data=inputs.data,
        locations_data=inputs.locations_data,
        target_data=inputs.target_data,
    )

    try:
        schema = load_projections_schema()
    except FileNotFoundError as exc:
        logging.error("Unable to load projections schema: %s", exc)
        return 1

    for filename, payload in processor.output_dict.items():
        if filename != "metadata.json":
            try:
                validate_against_schema(payload, schema)
            except ExternalDataError as exc:
                logging.error("Skipping %s due to schema validation error: %s", filename, exc)
                return 1
        save_json_file(
            pathogen=pathogen_key,
            output_path=str(output_path),
            output_filename=filename,
            file_contents=payload,
            overwrite=args.overwrite,
        )
        logging.debug("Saved %s", filename)

    logging.info("Completed processing. Files saved to %s", output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
