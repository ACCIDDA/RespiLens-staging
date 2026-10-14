"""
Class to process CDC/NSSP data into RespiLens-style JSON output.

Data is processed from resource id 'rdmq-nq56'
"""

import logging
import numpy as np
import os
import pandas as pd

from helper import retrieve_data_from_endpoint_aslist, STATENAME_TO_ABBREVIATION_MAP


logger = logging.getLogger(__name__)
script_dir = os.path.dirname(__file__)


class NSSPDataProcessor:
    def __init__(self, resource_id):
        self.data_url = "https://data.cdc.gov/resource/" + f"{resource_id}.json"
        self.output_dict = {}

        self._process_data()

    def _record_location_info(self, data: pd.DataFrame):
        """Build JSON content that shows which counties (if any) are represented by every state."""
        location_info = {}
        state_gbo = data.groupby('geography')
        for large_loc_aggregate, df in state_gbo:
            hsa_ids = list(set(df["hsa_nci_id"]))
            all_counties = set()
            for entry in df["hsa_counties"].dropna():
                counties = [c.strip() for c in entry.split(',')]
                all_counties.update(counties)
            
            location_info[large_loc_aggregate] = {
                "county names": sorted(list(all_counties)), 
                "hsa_ids": hsa_ids
            }
        return location_info

    
    def _process_data(self):
        """Fetches, processes, and structures NSSP data into self.output_dict"""
        # Get data set up 
        logger.info(f"Retrieving NSSP data from {self.data_url}...")
        numeric_cols = ['percent_visits_covid', 'percent_visits_influenza', 'percent_visits_rsv']
        # The endpoint has one row per county, repeating the same HSA-level values for every
        # county of an HSA. Ask for DISTINCT HSA-level rows so each (geography, hsa_nci_id, week_end)
        # appears once, and only keep rows that have at least one 'percent_visits_...' value.
        query_params = {
            "$select": "DISTINCT " + ", ".join(
                ['week_end', 'geography', 'hsa_nci_id', 'hsa_counties', 'buildnumber'] + numeric_cols
            ),
            "$where": " OR ".join(f"{col} IS NOT NULL" for col in numeric_cols),
            "$order": "geography, hsa_nci_id, week_end",
        }
        data_list = retrieve_data_from_endpoint_aslist(data_url=self.data_url, query_params=query_params) # read from endpoint
        data = pd.DataFrame(data_list)
        for col in numeric_cols: # null values are omitted from the JSON response
            if col not in data.columns:
                data[col] = None
        # ensure there is only one unique build in the data
        most_recent_build = data.sort_values(by='buildnumber', ascending=False)['buildnumber'].iloc[0]
        data = data[data['buildnumber'] == most_recent_build]
        # put dates in YYYY-MM-DD format
        data['week_end'] = pd.to_datetime(data['week_end']).dt.strftime('%Y-%m-%d')
        # guard against duplicated weeks so values stay aligned with dates
        data = data.drop_duplicates(subset=['geography', 'hsa_nci_id', 'week_end'], keep='first')
        # cast numeric cols as numeric
        for col in numeric_cols:
            data[col] = pd.to_numeric(data[col], errors='raise')
        # cleanse NaN values
        data = data.replace(np.nan, value=None) # cleanse NaN values 
        # --- patch for easier frontend display: build file with all counties for which there is data -- 
        location_info_json = self._record_location_info(data)
        self.output_dict["location_info.json"] = location_info_json
        # -- . --
        logger.info("Success ✅")
        
        # Process the data 
        # only one pipeline b/c we only use the given column names
        logger.info("Processing NSSP data...")
        loc_hsanciid_gbo = data.groupby(['geography', 'hsa_nci_id'])
        locs = []
        for grouping, df in loc_hsanciid_gbo:
            df = df.sort_values('week_end')
            locs.append(grouping)
            hsa_nci_id = df['hsa_nci_id'].iloc[0]
            state = df['geography'].iloc[0]
            hsa_counties = df['hsa_counties'].iloc[0]
            loc_abbrev = STATENAME_TO_ABBREVIATION_MAP[state]
            series = {
                "dates": list(df['week_end'])
            }
            for column in numeric_cols:
                series[column] = list(df[column])
            json_struct = {
                "metadata": {
                    "location": hsa_nci_id,
                    "abbreviation": loc_abbrev,
                    "location_name": hsa_counties,
                    "population": None,
                    "dataset": "NSSP",
                    "series_type": "timeseries"
                },
                "series": series
            }
            # name is, e.g., CO_704_nssp.json
            self.output_dict[f"{loc_abbrev}_{grouping[1]}_nssp.json"] = json_struct

        self.output_dict["metadata.json"] = self._build_metadata_file(locations=locs)
        
        logger.info("Success ✅")


    def _build_metadata_file(self, locations: list[str]) -> dict[str]:
        """Build a single output metadata.json file (one per dataset output)"""
        metadata_file_contents = {
            "last_updated": pd.Timestamp.now(tz='UTC').strftime("%Y-%m-%dT%H:%M:%SZ"),
            "dataset": "NSSP",
            "columns": ['percent_visits_covid', 'percent_visits_influenza', 'percent_visits_rsv'], # would have to manually change if they add columns we want
            "locations": locations
        }
        return metadata_file_contents


