"""Convert Hubverse flu data to RespiLens projections JSON"""

import json
import jsonschema
import pandas as pd

from .helper import get_location_info
from .projections_schema import SCHEMA


class FluConverter:
    """
    Attributes:
        df: The original .csv/.parquet file as a DF
        target_data: Target/ground truth data as a DF
        locations_data: Location metadata as a DF
        schema: RespiLens projections-style JSON schema 
        output_dict: All files produced by data conversion, keyed by future file name (e.g., <loc.abbrv.>_flusight)
    """
    def __init__(self, df: pd.DataFrame, target_data: pd.DataFrame, locations_data: pd.DataFrame):
        self.df = df
        self.target_data = target_data
        self.locations_data = locations_data
        self.schema=SCHEMA
        self.output_dict = {}

        # Group by location, all methods will assume df being passed is already grouped by loc
        self.location_separated_gbo = self.df.groupby('location')
        for loc in list(self.location_separated_gbo.groups.keys()):
            location_abbreviation = get_location_info(location_data=locations_data, location=loc, value_needed='abbreviation')
            file_name = f"{location_abbreviation}_flusight.json" 

            # Build data by keys
            metadata = self._build_metadata(df=self.location_separated_gbo.get_group(loc)) 
            ground_truth = self._build_ground_truth_data(df=self.location_separated_gbo.get_group(loc), target_data=self.target_data) 
            forecasts = self._build_forecast_data(df=self.location_separated_gbo.get_group(loc))
            available_models = self._build_available_models(df=self.location_separated_gbo.get_group(loc))
            # skipped all_models key?
            contents = {"metadata": metadata, "ground_truth": ground_truth, "forecasts": forecasts, "available_models": available_models}
            self.output_dict[file_name] = contents
        
        # Validate each output file contents with the JSON schema
        for key, json_stuff in self.output_dict.items():
            try:
                jsonschema.validate(instance=json_stuff, schema=self.schema)
            except jsonschema.ValidationError as e:
                raise ValueError(f"Failed to validate the JSON schema for output file {key} on error {e}") 
        
    
    def _horizon_date_calculator(self, reference_date: str | pd.DatetimeIndex, horizon: int | str) -> str: 
        # Ensure horizon is cast as an int
        horizon = int(horizon)
        # Ensure reference_date is a datetime
        reference_date = pd.to_datetime(reference_date)
        # Add requisite number of weeks
        target_date = (reference_date + pd.Timedelta(weeks=horizon)).strftime('%Y-%m-%d')

        return target_date


    def _build_metadata(self, df: pd.DataFrame) -> dict:
        location = str(df['location'].iloc[0]) # FIPS code
        metadata = {
            "location": location,
            "abbreviation": get_location_info(self.locations_data, location=location, value_needed='abbreviation'),
            "location_name": get_location_info(self.locations_data, location=location, value_needed='location_name'), 
            "population": get_location_info(self.locations_data, location=location, value_needed='population'), 
            "dataset": "flu",
            "series_type": "projection"
        }
        return metadata 


    def _build_forecast_data(self, df: pd.DataFrame) -> dict:
        reference_date = str(df['reference_date'].iloc[0])
        forecasts = {reference_date: {}}

        # Group by all necessary columns
        full_gbo = df.groupby(['target','horizon','output_type'])
        for group, grouped_df in full_gbo:

            # Set constants
            target = str(grouped_df['target'].iloc[0])
            model = str(grouped_df['model_name'].iloc[0])
            horizon = str(grouped_df['horizon'].iloc[0])
            
            # Separate by quantile/pmf, fill in values
            if grouped_df['output_type'].iloc[0] == 'quantile':
                target_dict = forecasts[reference_date].setdefault(target, {})
                model_dict = target_dict.setdefault(model, {})
                model_dict["type"] = "quantile"
                predictions_dict = model_dict.setdefault("predictions", {})
                predictions_dict[horizon] = {
                    "date": self._horizon_date_calculator(grouped_df['reference_date'].iloc[0], grouped_df['horizon'].iloc[0]), 
                    "quantiles": list(grouped_df['output_type_id']), 
                    "values": list(grouped_df['value'])} 

            elif grouped_df['output_type'].iloc[0] == 'pmf':
                target_dict = forecasts[reference_date].setdefault(target, {})
                model_dict = target_dict.setdefault(model, {})
                model_dict["type"] = "pmf"
                predictions_dict = model_dict.setdefault("predictions", {})
                predictions_dict[horizon] = {
                    "date": self._horizon_date_calculator(grouped_df['reference_date'].iloc[0], grouped_df['horizon'].iloc[0]), 
                    "categories": list(grouped_df['output_type_id']), 
                    "probabilities": list(grouped_df['value'])} 

            elif grouped_df['output_type'].iloc[0] == 'sample':
                # Not including 'sample' output in processed data
                continue


            else:
                raise ValueError(f"`output_type` msut be either 'quantile' or 'pmf', received: {set(grouped_df['output_type'])}")
            
        return forecasts
    

    def _build_ground_truth_data(self, df: pd.DataFrame, target_data: pd.DataFrame) -> dict:
        # Filter gt data by location 
        loc = str(df['location'].iloc[0])
        filtered_target_data = target_data[target_data['location'] == loc]

        # Only included most recent updates (max as_of date for each location-target_end_date combination)
        filtered_target_data = filtered_target_data.sort_values('as_of').drop_duplicates(subset=['target_end_date'], keep='last')

        dates = filtered_target_data['target_end_date'].tolist()
        values = filtered_target_data['observation'].tolist()
        rates = filtered_target_data['weekly_rate'].tolist()
        # Add to ground_truth dict
        ground_truth = {"dates": dates, "values": values, "rates": rates}

        return ground_truth
    

    def _build_available_models(self, df: pd.DataFrame) -> list:
        available_models = []
        unique_models_from_df = set(df['model_name'])
        for model in unique_models_from_df:
            available_models.append(model)
        
        return available_models


             
