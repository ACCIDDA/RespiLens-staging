"""Main execution script for the Hubverse->RespiLens pipeline"""


import logging
import argparse

logging.basicConfig(
     level=logging.INFO,
     format='%(message)s'
)
log = logging.getLogger(__name__)

from .hubverse_data import HubverseData
from .flu_converter import FluConverter
from .helper import save_json_file


def main():
    """Main execution function for Hubverse -> RL JSON conversion pipeline."""

    parser = argparse.ArgumentParser(description = "Convert Hubverse projections data to RespiLens json.")
    parser.add_argument("--data-path",
                        type=str,
                        required=True,
                        help="Path to the Hubverse data file to be converted.")
    parser.add_argument("--output-path",
                        type=str,
                        required=True,
                        help="Output path to save converted data to.")
    parser.add_argument("--pathogen",
                        type=str,
                        choices=['rsv','covid','flu'],
                        required=True,
                        help="The pathogen the file describes.")
    parser.add_argument("--locations-data-path",
                        type=str,
                        required=True,
                        hellp="Path to the locations.csv metadata for your data.")
    parser.add_argument("--target-data-path",
                        type=str,
                        required=True,
                        help="Path to the .csv target/ground truth data for the Hubverse data to be converted.") 
    args = parser.parse_args()

    # Establish input data
    log.info("Validating input data...")
    hubverse_data = HubverseData(
        data_path=args.data_path, 
        pathogen=args.pathogen, 
        target_data_path=args.target_data_path,
        locations_data_path=args.locations_data_path)
    log.info("Input data has been validated ✅")

    # Convert data based on pathogen, all converter objects should have .output_dict = {<file_name>: {contents}}
    log.info("Attempting to convert data to RespiLens JSON format...")
    if args.pathogen == 'rsv': # TODO 
        raise ValueError('RSV pipeline not yet implemented')
        # converter_object = RSVConverter(...)
        log.info("Data has been successfully converted ✅")
        # Iteratively save to output path + /rsv
        log.info("Saving output file(s)...")
        for file_name, contents in converter_object.output_dict.items():
                save_json_file(
                    pathogen='rsv', 
                    output_path=args.output_path, 
                    output_filename=file_name, 
                    file_contents=contents
                )
    if args.pathogen == 'covid': # TODO 
        raise ValueError('COVID pipeline not yet implemented')
        # converter_object = COVIDConverter(...)
        log.info("Data has been succesfully converted ✅")
        # Iteratively save to output path + /covid19
        log.info("Saving output file(s)...")
        for file_name, contents in converter_object.output_dict.items():
                save_json_file(
                    pathogen='covid', 
                    output_path=args.output_path, 
                    output_filename=file_name, 
                    file_contents=contents
                )
    if args.pathogen == 'flu':
        converter_object = FluConverter(df=hubverse_data.data, target_data=hubverse_data.target_data, locations_data=hubverse_data.locations_data) 
        log.info("Data has been successfully converted ✅")
        # Iteratively save to output path + /flusight
        log.info("Saving output file(s)...")
        for file_name, contents in converter_object.output_dict.items():
            save_json_file(
                pathogen='flu', 
                output_path=args.output_path, 
                output_filename=file_name, 
                file_contents=contents
            )
    
    log.info(f"Process complete ✅. Find output at {args.output_path}")


if __name__ == "__main__":
    main()