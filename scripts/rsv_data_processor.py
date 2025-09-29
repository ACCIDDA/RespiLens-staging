"""
Class to process RSV data (pd.DataFrame) into RespiLens-style JSON output.
"""

import logging
import pandas as pd

from helper import get_location_info

logger = logging.getLogger(__name__)


class RSVDataProcessor:
    def __init__(self, data: pd.DataFrame, locations_data: pd.DataFrame, target_data: pd.DataFrame):
        self.output_dict = {}
        self.df_data = data
        self.locations_data = locations_data # style the same as others
        self.target_data = target_data # `date`, `age_group`, `target`, `value`; 
        # 'as_of' is in the file name (all are up to date)

        # Add the combined_targets column to combine `age_group` and `target`, drop NaNs from target data
        self.df_data['combined_target'] = self.df_data['age_group'] + '_' + self.df_data['target']
        self.target_data = self.target_data.dropna(subset=['value']).copy()
        self.target_data['combined_target'] = self.target_data['age_group'] + '_' + self.target_data['target']
        # Add target_end_date column to self.df_data
        self.df_data['target_end_date'] = pd.to_datetime(self.df_data['origin_date']) + pd.to_timedelta(self.df_data['horizon'], unit='W')

        # Group Hubverse data by loc
        logger.info("Building individual RSV JSON files...")
        locations_gbo = self.df_data.groupby('location')
        for loc in list(locations_gbo.groups.keys()):
            location_abbreviation = get_location_info(
                location_data=self.locations_data,
                location=loc,
                value_needed='abbreviation'
            )
            file_name = f"{location_abbreviation}_rsv.json"
            loc_df = locations_gbo.get_group(loc)

            # Build data by future JSON key
            metadata = self._build_metadata_key(df=loc_df)
            ground_truth = self._build_ground_truth_key(df=loc_df)
            forecasts = self._build_forecasts_key(df=loc_df)
            contents = {
                "metadata": metadata,
                "ground_truth": ground_truth,
                "forecasts": forecasts
            }
            self.output_dict[file_name] = contents

        # Add a single metadata file to output dict
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
            "dataset": "rsv forecasts",
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
        ground_truth = {}
         # Filter gt data by current location
        location = str(df['location'].iloc[0])
        filtered_target_data = self.target_data[self.target_data['location'] == location].copy()

        # Ensure date columns are in datetime format for sorting, only use relevant flu season 
        filtered_target_data['date'] = pd.to_datetime(filtered_target_data['date'])
        filtered_target_data = filtered_target_data[filtered_target_data['date'] >= pd.Timestamp('2023-10-01')].copy() # (can change)

        # Group by combined target, then fill in values
        filtered_target_data_gbo = filtered_target_data.groupby('combined_target')
        for combined_target_name in list(filtered_target_data_gbo.groups.keys()):
            current_target_data = filtered_target_data_gbo.get_group(combined_target_name)
            current_target_data = current_target_data.sort_values(by='date')
            combined_target_dict = ground_truth.setdefault(combined_target_name, {})
            combined_target_dict['dates'] = current_target_data['date'].dt.strftime('%Y-%m-%d').tolist()
            combined_target_dict['values'] = current_target_data['value'].tolist()

        return ground_truth


    def _build_forecasts_key(self, df: pd.DataFrame) -> dict:
        """Build forecasts key of an individual JSON file"""
        forecasts = {}

        # Group by all necessary columns 
        full_gbo = df.groupby(['origin_date', 'combined_target', 'model_id', 'horizon', 'output_type'])
        for group, grouped_df in full_gbo:

            # Set constants
            origin_date = str(grouped_df['origin_date'].iloc[0])
            combined_target = str(grouped_df['combined_target'].iloc[0])
            model = str(grouped_df['model_id'].iloc[0])
            horizon = str(grouped_df['horizon'].iloc[0])

            # Separte by output_type, fill in values
            if grouped_df['output_type'].iloc[0] == 'quantile':
                origin_date_dict = forecasts.setdefault(origin_date, {})
                combined_target_dict = origin_date_dict.setdefault(combined_target, {})
                model_dict = combined_target_dict.setdefault(model, {})
                model_dict["type"] = "quantile"
                predictions_dict = model_dict.setdefault("predictions", {})
                predictions_dict[horizon] = {
                    "date": str(grouped_df['target_end_date'].iloc[0]), #TODO add 'target_end_date'
                    "quantiles": list(grouped_df['output_type_id']),
                    "values": list(grouped_df['value'])
                }

            elif grouped_df['output_type'].iloc[0] == 'pmf':
                raise ValueError(f"'pmf' `output_type` not currently supported for RSV. "
                                 f"If RSV-forecast-hub has added 'pmf', contact RespiLens creators.")
            elif grouped_df['output_type'].iloc[0] == 'sample':
                continue
            else:
                raise ValueError(f"`output_type` of input data must be 'quantile', "
                                 f"received '{grouped_df['output_type'].iloc[0]}'")
        
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

