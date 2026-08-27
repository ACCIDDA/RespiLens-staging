"""
Class to process CDC/NHSN data (pd.DataFrame) into RespiLens-style JSON output.

Data is processed from resource id 'ua7e-t2fy'.
"""

import logging
import numpy as np
import os
import pandas as pd
import requests

from helper import get_location_info, STATEABBREVIATION_TO_FIPS_MAP, retrieve_data_from_endpoint_aslist

logger = logging.getLogger(__name__)
script_dir = os.path.dirname(__file__)
locations_file_path = os.path.join(script_dir, 'locations.csv')


LOCATIONS_ABBREV = [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA',
        'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY',
        'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX',
        'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'US'
    ]


class NHSNDataProcessor:
    def __init__(
            self,
            resource_id: str,
            preliminary_resource_id: str,
            replace_column_names: bool = True
        ):
        self.replace_column_names = replace_column_names
        self.data_url = "https://data.cdc.gov/resource/" + f"{resource_id}.json"
        self.metadata_url = "https://data.cdc.gov/api/views/" + f"{resource_id}.json"
        self.preliminary_data_url = "https://data.cdc.gov/resource/" + f"{preliminary_resource_id}.json"
        self.preliminary_metadata_url = "https://data.cdc.gov/api/views/" + f"{preliminary_resource_id}.json"
        self.output_dict = {}
        self.locations_data = pd.read_csv(locations_file_path)

        self._process_data()

    def _process_data(self):
        """Fetches, processes, and structures NHSN data into self.output_dict"""
        # Get data + metadata 
        logger.info("Retrieving NHSN data from %s...", self.data_url)
        data = self._prepare_dataset(data_url=self.data_url)
        cdc_metadata = requests.get(self.metadata_url).json()
        preliminary_data = self._prepare_dataset(data_url=self.preliminary_data_url)
        preliminary_cdc_metadata = requests.get(self.preliminary_metadata_url).json()
        logger.info("Success ✅")

        # pre-processing check:
        # ensure same loc and weekendingdate set between the two
        unique_regions = set(data['jurisdiction'])
        preliminary_unique_regions = set(preliminary_data['jurisdiction'])
        if region_diff := unique_regions ^ preliminary_unique_regions:
            raise ValueError(
                "Detected a difference between NHSN regular data locs and NHSN prelim data locs: "
                f"{region_diff}.\nLen regular locs: {len(unique_regions)}\nLen prelim locs: {len(preliminary_unique_regions)}"
            )
        unique_dates = set(data['weekendingdate'])
        preliminary_unique_dates = set(preliminary_data['weekendingdate'])
        if missing_from_prelim := (unique_dates - preliminary_unique_dates): # fail if prelim is missing any, or the two are lopsided 
            raise ValueError(
                f"Data contains dates not present in preliminary data: {missing_from_prelim}"
            )
        if (preliminary_unique_dates - unique_dates): # limit if just prelim has extra dates (this will often be the case as prelim releases new dates earlier)
            preliminary_data = preliminary_data[
                preliminary_data['weekendingdate'].isin(unique_dates)
            ].copy()

        # Process the data
        # Pipeline #1: key on longform location column name
        logger.info("Processing NHSN data...")
        if self.replace_column_names:
            data = self._replace_column_names(data, cdc_metadata)
            preliminary_data = self._replace_column_names(preliminary_data, preliminary_cdc_metadata)
            self.output_dict["metadata.json"] = self._build_metadata_file(
                list(data.columns),
                list(set(data['Geographic aggregation']))
            )
            unique_regions = set(data['Geographic aggregation'])
            for region in unique_regions:
                current_region_fips_code = STATEABBREVIATION_TO_FIPS_MAP[region]
                current_region_df = data[data['Geographic aggregation'] == region]
                current_region_df = current_region_df.sort_values(by='Week Ending Date')
                current_region_preliminary_df = preliminary_data[preliminary_data['Geographic aggregation'] == region]
                current_region_preliminary_df = current_region_preliminary_df.sort_values(by='Week Ending Date')

                series = {
                    "dates": list(current_region_df['Week Ending Date'])
                }
                preliminary_series = {
                    "dates": list(current_region_preliminary_df['Week Ending Date'])
                }

                columns = [col for col in current_region_df.columns if col not in ["Geographic aggregation", "Week Ending Date"]]
                for column in columns:
                    series[column] = list(current_region_df[column])

                preliminary_columns = [
                    col for col in current_region_preliminary_df.columns
                    if col not in ["Geographic aggregation", "Week Ending Date"]
                ]
                for column in preliminary_columns:
                    preliminary_series[column] = list(current_region_preliminary_df[column])

                json_struct = {
                    "metadata": {
                        "location": current_region_fips_code,
                        "abbreviation": region,
                        "location_name": get_location_info(
                            location_data=self.locations_data,
                            location=current_region_fips_code,
                            value_needed="location_name"
                        ),
                        "population": get_location_info(
                            location_data=self.locations_data,
                            location=current_region_fips_code,
                            value_needed='population'
                        ),
                        "dataset": "NHSN",
                        "series_type": "timeseries"
                    },
                    "series": series,
                    "preliminary_series": preliminary_series
                }
                self.output_dict[f"{region}_nhsn.json"] = json_struct

        # Pipeline #2: key on shortform location column name
        else:
            self.output_dict["metadata.json"] = self._build_metadata_file(
                list(data.columns),
                list(set(data['jurisdiction']))
            )
            unique_regions = set(data['jurisdiction'])
            for region in unique_regions:
                current_region_df = data[data['jurisdiction'] == region]
                current_region_df = current_region_df.sort_values(by='weekendingdate')
                current_region_preliminary_df = preliminary_data[preliminary_data['jurisdiction'] == region]
                current_region_preliminary_df = current_region_preliminary_df.sort_values(by='weekendingdate')

                series = {
                    "dates": list(current_region_df['weekendingdate'])
                }
                preliminary_series = {
                    "dates": list(current_region_preliminary_df['weekendingdate'])
                }

                columns = [col for col in current_region_df.columns if col not in ["jurisdiction", "weekendingdate"]]
                for column in columns:
                    series[column] = list(current_region_df[column])

                preliminary_columns = [
                    col for col in current_region_preliminary_df.columns
                    if col not in ["jurisdiction", "weekendingdate"]
                ]
                for column in preliminary_columns:
                    preliminary_series[column] = list(current_region_preliminary_df[column])

                json_struct = {
                    "metadata": {
                        "location": region,
                        "abbreviation": "",
                        "location_name": "",
                        "population": 0.0,
                        "dataset": "NHSN",
                        "series_type": "time series"
                    },
                    "series": series,
                    "preliminary_series": preliminary_series
                }
                self.output_dict[f"{region}_nhsn.json"] = json_struct

        logger.info("Success ✅")

    def _prepare_dataset(self, data_url: str) -> pd.DataFrame:
        """Download and normalize one NHSN dataset."""
        data = pd.DataFrame(retrieve_data_from_endpoint_aslist(data_url=data_url)) # read from endpoint
        non_numeric_cols = ['jurisdiction', 'weekendingdate'] # make numeric cols not strings
        data = data.drop(columns=['respseason'])
        for col in data.columns:
            if col not in non_numeric_cols:
                data[col] = pd.to_numeric(data[col], errors='raise')
        data = data.replace(np.nan, value=None) # cleanse NaN values
        data.loc[data['jurisdiction'].str.lower() == 'usa', 'jurisdiction'] = 'US' # change USA jurisdiction to US
        data = data[data['jurisdiction'].isin(LOCATIONS_ABBREV)].copy() # filter out unwanted regions
        data['weekendingdate'] = pd.to_datetime(data['weekendingdate']).dt.strftime('%Y-%m-%d') # ensure date columns are dates
        return data

    def _replace_column_names(self, data: pd.DataFrame, cdc_metadata: dict) -> pd.DataFrame:
        """Replace short-form column names with long-form column names"""
        column_name_map = {
                col_info['fieldName']: col_info['name']
                for col_info in cdc_metadata['columns']
            }
        return data.rename(columns=column_name_map, errors="ignore")

    def _build_metadata_file(self, columns: list[str], locations: list[str]) -> dict:
        """Build a single output metadata.json file (one per dataset output)"""
        metadata_file_contents = {
            "last_updated": pd.Timestamp.now(tz='UTC').strftime("%Y-%m-%dT%H:%M:%SZ"),
            "dataset": "NHSN",
            "columns": columns,
            "locations": locations
        }
        return metadata_file_contents
