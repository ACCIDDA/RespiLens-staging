"""
Class to process COVID19 data (pd.DataFrame) into RespiLens-style JSON output.
"""

import logging
import pandas as pd

from helper import get_location_info

logger = logging.getLogger(__name__)


class COVIDDataProcessor:
    def __init__(self, data: pd.DataFrame, locations_data: pd.DataFrame, target_data: pd.DataFrame):
        self.output_dict = {}
        self.df_data = data
        self.locations_data = locations_data
        self.target_data = target_data

        # Group Hubverse data by loc
        logger.info("Building individual COVID JSON files...")
        locations_gbo = self.df_data.groupby('location')
        for loc in list(locations_gbo.groups.keys()):
            location_abbreviation = get_location_info(
                location_data=self.locations_data,
                location=loc,
                value_needed='abbreviation'
            )
            file_name = f"{location_abbreviation}_covid19.json"
            loc_df = locations_gbo.get_group(loc)

            # Build data by future JSON key
            metadata = self._build_metadata_key(df=loc_df)
            ground_truth = self._build_ground_truth_key(df=loc_df)
            forecasts = self._build_forecasts_key(df=loc_df)
            contents = {
                "metadata": metadata,
                "ground_truth": ground_truth,
                "forecasts": forecasts,
            }
            self.output_dict[file_name] = contents

        # Add single metadata file to output_dict
        metadata_file_contents = self._build_metadata_file(all_models=self._build_all_models_list())
        self.output_dict["metadata.json"] = metadata_file_contents
        logger.info("Success ✅")


    def _build_metadata_key(self, df: pd.DataFrame) -> dict:
        """Build metadata key of an individual JSON file"""
        location = str(df['location'].iloc[0]) # FIPS code
        metadata = {
            "location": location,
            "abbreviation": get_location_info(self.locations_data, location=location, value_needed='abbreviation'),
            "location_name": get_location_info(self.locations_data, location=location, value_needed='location_name'),
            "population": get_location_info(self.locations_data, location=location, value_needed='population'),
            "dataset": "covid19 forecasts",
            "series_type": "projection",
            "hubverse_keys": {
                "models": self._build_available_models_list(df=df),
                "targets": list(set(df['target'])),
                "horizons": [str(h) for h in df['horizon'].unique()],
                "output_types": [item for item in df['output_type'].unique() if item != 'sample']
            }
        }
        return metadata
    

    def _build_ground_truth_key(self, df: pd.DataFrame) -> dict: 
        """Build ground_truth key of an individual JSON file"""
        # Filter gt data by current location
        location = str(df['location'].iloc[0])
        filtered_target_data = self.target_data[
            (self.target_data['location'] == location) & 
            (self.target_data['target'] == 'wk inc covid hosp')
        ].copy()

        # Ensure date columns are in datetime format for sorting
        filtered_target_data['as_of'] = pd.to_datetime(filtered_target_data['as_of'])
        filtered_target_data['date'] = pd.to_datetime(filtered_target_data['date'])

        # Select only most recently updated record for each week
        truth = filtered_target_data.sort_values('as_of').drop_duplicates(subset=['date'], keep='last')

        # Filter for the relevant covid season (can change)
        truth = truth[truth['date'] >= pd.Timestamp('2023-10-01')]

        # Sort before creating lists
        truth.sort_values('date', inplace=True)

        # Build and return final ground_truth dict
        ground_truth = {
            "dates": truth['date'].dt.strftime('%Y-%m-%d').tolist(),
            "wk inc covid hosp": truth['observation'].tolist()
        }
        return ground_truth


    def _build_forecasts_key(self, df: pd.DataFrame) -> dict:
        """Build forecasts key of an individual JSON file"""
        forecasts = {}

        # Group by all necessary columns
        full_gbo = df.groupby(['reference_date', 'target', 'model_id', 'horizon', 'output_type'])
        for group, grouped_df in full_gbo:

            # Set constants 
            reference_date = str(grouped_df['reference_date'].iloc[0])
            target = str(grouped_df['target'].iloc[0])
            model = str(grouped_df['model_id'].iloc[0])
            horizon = str(grouped_df['horizon'].iloc[0])

            # Separate by quanitle/pmf output_type, fill in values
            if grouped_df['output_type'].iloc[0] == 'quantile':
                reference_date_dict = forecasts.setdefault(reference_date, {})
                target_dict = reference_date_dict.setdefault(target, {})
                model_dict = target_dict.setdefault(model, {})
                model_dict["type"] = "quantile"
                predictions_dict = model_dict.setdefault("predictions", {})
                predictions_dict[horizon] = {
                    "date": str(grouped_df['target_end_date'].iloc[0]),
                    "quantiles": list(grouped_df['output_type_id']),
                    "values": list(grouped_df['value'])
                }
            elif grouped_df['output_type'].iloc[0] == 'pmf': # no pmf for covid hub yet, but just in case
                reference_date_dict = forecasts.setdefault(reference_date, {})
                target_dict = reference_date_dict.setdefault(target, {})
                model_dict = target_dict.setdefault(model, {})
                model_dict["type"] = "pmf"
                predictions_dict = model_dict.setdefault("predictions", {})
                predictions_dict[horizon] = {
                    "date": str(grouped_df['target_end_date'].iloc[0]),
                    "categories": list(grouped_df['output_type_id']),
                    "probabilities": list(grouped_df['value'])
                }
            elif grouped_df['output_type'].iloc[0] == 'sample':
                # not including 'sample' output_type in processed data
                continue
            else:
                raise ValueError(f"`output_type` of input data must either be 'quantile' or 'pmf', " 
                                 f"received '{grouped_df['output_type'].iloc}'")
            
        return forecasts


    def _build_available_models_list(self, df: pd.DataFrame) -> list:
        """Build available_models list of models for a specific location"""
        available_models = []
        unique_models_from_loc_df = set(df['model_id'])
        for model in unique_models_from_loc_df:
            available_models.append(model)
        return available_models


    def _build_all_models_list(self) -> list:
        """Build all_models list of every model for any location"""
        all_models = []
        unique_models_from_primary_df = set(self.df_data['model_id'])
        for model in unique_models_from_primary_df:
            all_models.append(model)
        return all_models
    

    def _build_metadata_file(self, all_models: list[str]) -> dict:
        """Build a single output metadata.json file (one per dataset output)"""
        metadata_file_contents = {
            "last_updated": pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S'),
            "models": sorted(all_models),
            "locations": []
        }
        for _, row in self.locations_data.iterrows():
            location_info = {
                "location": str(row['location']),
                "abbreviation": str(row['abbreviation']),
                "location_name": str(row['location_name']),
                "population": None if row['population'] is None else float(row['population']) # in case there is null pop
            }
            metadata_file_contents["locations"].append(location_info)
            
        return metadata_file_contents