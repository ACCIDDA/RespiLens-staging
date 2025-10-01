"""Pull/process all data required for RespiLens"""

import argparse
import logging
import pandas as pd
import sys
from pathlib import Path
from hubdata import connect_hub


from flusight_data_processor import FlusightDataProcessor
from rsv_data_processor import RSVDataProcessor
from covid19_data_processor import COVIDDataProcessor
from cdc_data_processor import CDCDataProcessor
from helper import save_json_file, hubverse_df_preprocessor, clean_nan_values

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main():
    """
    Main execution function
    """
    parser = argparse.ArgumentParser(description = 'Pull/process all data required for RespiLens.')
    parser.add_argument("--output-path",
                        type=str,
                        required=False,
                        help="Absolute path where you want to save data do.")
    parser.add_argument("--flusight-hub-path",
                        type=str,
                        required=False,
                        help="Absolute path to local clone of FluSight forecast repo.")
    parser.add_argument("--rsv-hub-path",
                        type=str,
                        required=False,
                        help="Absolute path to local clone of RSV forecast repo.")
    parser.add_argument("--covid-hub-path",
                        type=str,
                        required=False,
                        help="Absolute path to local clone of COVID19 forecaast repo.")
    parser.add_argument("--CDC",
                        action='store_true',
                        required=False,
                        help="If set, pull NHSN data.") 
    args = parser.parse_args()

    if not (args.flusight_hub_path or args.rsv_hub_path or args.covid_hub_path or args.CDC):
        print("🛑 No hub paths or CDC flag provided 🛑, so no data will be fetched.")
        print("Please re-run script with hub path(s) specified or CDC flag set.")
        sys.exit(1)

    logger.info("Beginning conversion process...")

    if args.flusight_hub_path:
        # Use HubdataPy to get all Flusight data in one df
        logger.info("Establishing connection to local FluSight repository...")
        flu_hub_conn = connect_hub(args.flusight_hub_path)
        logger.info("Success ✅")
        logger.info("Collecting data from FluSight repo...")
        flu_hubverse_df = clean_nan_values(hubverse_df_preprocessor(df=flu_hub_conn.get_dataset().to_table().to_pandas()))
        flu_locations_data = clean_nan_values(pd.read_csv(Path(args.flusight_hub_path) / 'auxiliary-data/locations.csv'))
        flu_target_data = clean_nan_values(pd.read_csv(Path(args.flusight_hub_path) / 'target-data/time-series.csv'))
        logger.info("Success ✅")
        # Initialize converter object
        flu_processor_object = FlusightDataProcessor(
            data=flu_hubverse_df,
            locations_data=flu_locations_data,
            target_data=flu_target_data
        )
        # Iteratively save output files
        logger.info("Saving flu JSON files...")
        for filename, contents in flu_processor_object.output_dict.items():
            save_json_file(
                pathogen='flu',
                output_path=args.output_path,
                output_filename=filename,
                file_contents=contents,
                overwrite=True
            )
        logger.info("Success ✅")

    
    if args.rsv_hub_path:
        # Use HubdataPy to get all RSV data in one df
        logger.info("Establishing connection to local RSV repository...")
        rsv_hub_conn = connect_hub(args.rsv_hub_path)
        logger.info("Success ✅")
        logger.info("Collecting data from RSV repo...")
        rsv_hubverse_df = clean_nan_values(hubverse_df_preprocessor(df=rsv_hub_conn.get_dataset().to_table().to_pandas()))
        rsv_locations_data = clean_nan_values(pd.read_csv(Path(args.rsv_hub_path) / 'auxiliary-data/location_census/locations.csv'))
        # RSV target-data files have dynamic names based on date; find most recent one
        rsv_base_path = Path(args.rsv_hub_path)
        rsv_target_data_files = sorted(rsv_base_path.glob("target-data/*_rsvnet_hospitalization.csv"))
        if not rsv_target_data_files:
            raise FileNotFoundError("Could not find RSV target data files. Check that target-data dir exists in local RSV repo.")
        latest_rsv_target_file_path = rsv_target_data_files[-1]
        # Explicitly read in 'location' dtype as str b/c there are mixed values 
        rsv_target_data = clean_nan_values(pd.read_csv(latest_rsv_target_file_path, dtype={'location': str}))
        # Initialize converter object
        rsv_processor_object = RSVDataProcessor(
            data=rsv_hubverse_df,
            locations_data=rsv_locations_data,
            target_data=rsv_target_data
        )
        # Iteratively save output files
        logger.info("Saving RSV JSON files...")
        for filename, contents in rsv_processor_object.output_dict.items():
            save_json_file(
                pathogen='rsv',
                output_path=args.output_path,
                output_filename=filename,
                file_contents=contents,
                overwrite=True
            )
        logger.info("Success ✅")
    
    if args.covid_hub_path:
        # Use HubdataPy to get all COVID data in one df
        logger.info("Establishing connection to local COVID repository...")
        covid_hub_conn = connect_hub(args.covid_hub_path)
        logger.info("Success ✅")
        logger.info("Collecting data from COVID repo...")
        covid_hubverse_df = clean_nan_values(hubverse_df_preprocessor(df=covid_hub_conn.get_dataset().to_table().to_pandas()))
        covid_locations_data = clean_nan_values(pd.read_csv(Path(args.covid_hub_path) / 'auxiliary-data/locations.csv'))
        covid_target_data = clean_nan_values(pd.read_parquet(Path(args.covid_hub_path) / 'target-data/time-series.parquet'))
        logger.info("Success ✅")
        # Initialize converter object
        covid_processor_object = COVIDDataProcessor(
            data=covid_hubverse_df,
            locations_data=covid_locations_data,
            target_data=covid_target_data
        )
        # Iteratively save output files
        logger.info("Saving COVID JSON files...")
        for filename, contents in covid_processor_object.output_dict.items():
            save_json_file(
                pathogen='covid',
                output_path=args.output_path,
                output_filename=filename,
                file_contents=contents,
                overwrite=True
            )
        logger.info("Success ✅")

    if args.CDC:
        cdc_processor_object = CDCDataProcessor(resource_id='ua7e-t2fy', replace_column_names=True)
        logger.info("Iteratively saving CDC JSON files...")
        for filename, contents in cdc_processor_object.output_dict.items():
            save_json_file(
                pathogen="cdc",
                output_path=args.output_path,
                output_filename=filename,
                file_contents=contents,
                overwrite=True
            )
        logger.info("Success ✅")
    
    logger.info("Process complete.")


if __name__ == "__main__":
    main()
    
