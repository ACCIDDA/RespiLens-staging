"""
CLI entry point for converting Hubverse exports into RespiLens projection JSON files.
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

from helper import save_json_file
from external_data import ExternalDataError, load_inputs, load_projections_schema, validate_against_schema
from flusight_data_processor import FlusightDataProcessor
from rsv_data_processor import RSVDataProcessor
from covid19_data_processor import COVIDDataProcessor


PROCESSOR_MAP = {
    "flu": FlusightDataProcessor,
    "rsv": RSVDataProcessor,
    "covid": COVIDDataProcessor,
}


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert Hubverse data into RespiLens projections JSON.")
    parser.add_argument("--output-path", required=True, help="Directory where JSON files will be written.")
    parser.add_argument(
        "--pathogen",
        required=True,
        choices=sorted(PROCESSOR_MAP.keys()),
        help="Pathogen to process (determines schema checks and processor).",
    )
    parser.add_argument(
        "--data-path",
        required=True,
        help="Absolute path to Hubverse forecast data in CSV format.",
    )
    parser.add_argument(
        "--target-data-path",
        required=True,
        help="Absolute path to Hubverse ground truth target data (CSV or Parquet).",
    )
    parser.add_argument(
        "--locations-data-path",
        required=True,
        help="Absolute path to location metadata CSV.",
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
    logging.basicConfig(level=getattr(logging, args.log_level.upper()))
    output_path = Path(args.output_path).resolve()

    try:
        inputs = load_inputs(
            pathogen=args.pathogen,
            data_path=Path(args.data_path).resolve(),
            target_data_path=Path(args.target_data_path).resolve(),
            locations_data_path=Path(args.locations_data_path).resolve(),
        )
    except ExternalDataError as exc:
        logging.error("Input validation failed: %s", exc)
        return 1

    processor_cls = PROCESSOR_MAP[args.pathogen]

    logging.info("Starting %s projections processing...", args.pathogen.upper())
    processor = processor_cls(
        data=inputs.data,
        locations_data=inputs.locations_data,
        target_data=inputs.target_data,
    )

    schema = load_projections_schema()
    for filename, payload in processor.output_dict.items():
        if filename != "metadata.json":
            try:
                validate_against_schema(payload, schema)
            except ExternalDataError as exc:
                logging.error("Skipping %s due to schema validation error: %s", filename, exc)
                return 1
        save_json_file(
            pathogen=args.pathogen,
            output_path=str(output_path),
            output_filename=filename,
            file_contents=payload,
            overwrite=args.overwrite,
        )
        logging.debug("Saved %s", filename)

    logging.info("Completed processing. Files saved to %s", output_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
