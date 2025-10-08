"""Convert external .csv data into RespiLens.projections.json style"""

import argparse
import logging

from flusight_data_processor import FlusightDataProcessor
from rsv_data_processor import RSVDataProcessor
from covid19_data_processor import COVIDDataProcessor
from external_data import ExternalData
from helper import save_json_file, validate_respilens_json


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main():
    """Main execution function"""
    parser = argparse.ArgumentParser(description="Convert .csv data to RespiLens.projetions.json format")
    parser.add_argument("--output-path",
                        type=str,
                        required=True,
                        help="Absoute path to where you want to save data to.")
    parser.add_argument("--pathogen",
                    type=str,
                    required=True,
                    choices=['covid', 'flu', 'rsv'], 
                    help="The pathogen the data describes.")
    parser.add_argument("--data-path",
                        type=str,
                        required=True,
                        help="Absoluste path to data to be converted.")
    parser.add_argument("--target-data-path",
                        type=str,
                        required=True,
                        help="Absolute path to related ground truth/target data.")
    parser.add_argument("--locations-data-path",
                        type=str,
                        required=True,
                        help="Absolute path to related location metadata.")
    parser.add_argument("--overwrite",
                        action='store_true',
                        required=False,
                        help="If set, overwrite files with the same name in output directory.")
    args = parser.parse_args()
    
    # Validate all input data
    ValidatedData = ExternalData(
        data_path=args.data_path,
        target_data_path=args.target_data_path,
        locations_data_path=args.locations_data_path,
        pathogen=args.pathogen
    ) 
    overwrite = args.overwrite

    # Convert based on pathogen, validate, and save 
    if args.pathogen == 'flu':
        flu_processor_object = FlusightDataProcessor(
            data=ValidatedData.data,
            locations_data=ValidatedData.locations_data,
            target_data=ValidatedData.target_data
        )
        logger.info("Validating converted flu JSON files...")
        validation_dict = {}
        for filename, contents in flu_processor_object.output_dict.items():
            if filename == 'metadata.json':
                continue
            else:
                validation_dict[filename] = (validate_respilens_json(json_contents=contents, type='projections'))
        bad_files = []
        for fn, validation_status in validation_dict.items():
            if validation_status != True:
                bad_files.append(fn)
            else:
                continue
        if bad_files:
            logger.warning(f"⚠️ Files {bad_files} failed RespiLens projections schema json validation (but will not be excluded from saving)")
            logger.warning(f"Check contents of json files for bad json or incorrect data types.")
        else: logger.info("Success ✅")
        logger.info("Saving converted flu JSON files...")
        for filename, contents in flu_processor_object.output_dict.items():
            save_json_file(
                pathogen='flu',
                output_path=args.output_path,
                output_filename=filename,
                file_contents=contents,
                overwrite=overwrite
            )
        logger.info("Success ✅")
    elif args.pathogen == 'covid':
        covid_processor_object = COVIDDataProcessor(
            data=ValidatedData.data,
            locations_data=ValidatedData.locations_data,
            target_data=ValidatedData.target_data
        )
        logger.info("Validating converted COVID19 JSON files...")
        validation_dict = {}
        for filename, contents in covid_processor_object.output_dict.items():
            if filename == 'metadata.json':
                continue
            else:
                validation_dict[filename] = (validate_respilens_json(json_contents=contents, type='projections'))
        bad_files = []
        for fn, validation_status in validation_dict.items():
            if validation_status != True:
                bad_files.append(fn)
            else:
                continue
        if bad_files:
            logger.warning(f"⚠️ Files {bad_files} failed RespiLens projections schema json validation (but will not be excluded from saving)")
            logger.warning(f"Check contents of json files for bad json or incorrect data types.")
        else: logger.info("Success ✅")
        logger.info("Saving converted COVID19 JSON files...")
        for filename, contents in covid_processor_object.output_dict.items():
            save_json_file(
                pathogen='covid',
                output_path=args.output_path,
                output_filename=filename,
                file_contents=contents,
                overwrite=overwrite
            )
        logger.info("Success ✅")
    elif args.pathogen == 'rsv':
        rsv_processor_object = RSVDataProcessor(
            data=ValidatedData.data,
            locations_data=ValidatedData.locations_data,
            target_data=ValidatedData.target_data
        )
        logger.info("Validating converted RSV JSON files...")
        validation_dict = {}
        for filename, contents in rsv_processor_object.output_dict.items():
            if filename == 'metadata.json':
                continue
            else:
                validation_dict[filename] = (validate_respilens_json(json_contents=contents, type='projections'))
        bad_files = []
        for fn, validation_status in validation_dict.items():
            if validation_status != True:
                bad_files.append(fn)
            else:
                continue
        if bad_files:
            logger.warning(f"⚠️ Files {bad_files} failed RespiLens projections schema json validation (but will not be excluded from saving)")
            logger.warning(f"Check contents of json files for bad json or incorrect data types.")
        else: logger.info("Success ✅")
        logger.info("Saving converted RSV JSON files...")
        for filename, contents in rsv_processor_object.output_dict.items():
            save_json_file(
                pathogen='rsv',
                output_path=args.output_path,
                output_filename=filename,
                file_contents=contents,
                overwrite=overwrite
            )
        logger.info("Success ✅")

    logger.info("Process complete.")


if __name__ == "__main__":
    main()