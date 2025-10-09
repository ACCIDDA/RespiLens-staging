"""Logic to validate external data to be converted to RespiLens data."""

import logging
from typing import Literal
import pandas as pd
from pathlib import Path

from helper import clean_nan_values, hubverse_df_preprocessor

logger = logging.getLogger(__name__)


class ExternalData:
    def __init__(
            self,
            data_path: str,
            target_data_path: str,
            locations_data_path: str,
            pathogen: str = Literal['rsv', 'flu', 'covid'],
            type: str = Literal['projections'] # potentially to be expanded to 'timeseries' later
        ):
        # Confirm pathogen input
        if pathogen not in ['rsv', 'flu', 'covid']:
            raise ValueError(f"`--pathogen` must be one of 'rsv', 'flu', 'covid'. Received: {pathogen}")
        self.pathogen = pathogen 

        # Load data from path
        logger.info("Loading input data...")
        self.data = self._confirm_path_and_load(data_path)
        self.target_data = self._confirm_path_and_load(target_data_path)
        self.locations_data = self._confirm_path_and_load(locations_data_path)
        logger.info("Success ✅")

        # Validate data
        logger.info("Confirming required columns and values...")
        self._check_data_columns()
        self._check_target_data_columns()
        self._check_locations_data_columns()
        logger.info("Success ✅")


    def _confirm_path_and_load(
            self, 
            path: str, 
            which: str = Literal['data', 'locations data', 'target data']
        ) -> pd.DataFrame:
        path = Path(path)
        ext = path.suffix.lower()
        if (not path.is_file()) or (ext not in ['.csv', '.parquet']):
            raise FileExistsError(f"{which} path must point to a valid .csv or .parquet file. "
                                  f"Received {path} with file extension {path.suffix.lower()}")
        if not path.exists():
            raise FileNotFoundError(f"Could not find {which} at path {path}")
        if ext == '.csv':
            df_data = pd.read_csv(path)
        elif ext == '.parquet':
            df_data = pd.read_parquet(path)
        return df_data
    

    def _check_data_columns(self) -> None:
        # Check existence of required columns
        hubverse_cols = ['reference_date', 'location', 'horizon', 'target_end_date', 'target',
       'output_type', 'output_type_id', 'value', 'model_id']
        if missing_cols := (set(hubverse_cols) - set(self.data.columns)):
            raise ValueError(f"Input data is missing required columns: {missing_cols}")
        self.data = clean_nan_values(hubverse_df_preprocessor(df=self.data, filter_quantiles=False)) # TODO, add modular quantile filtering


    def _check_target_data_columns(self) -> None:
        # Check existence of required columns
        flu_target_data_cols = ['as_of', 'target', 'target_end_date', 'location', 'observation'] # don't need weekly_rate and location_name
        covid_target_data_cols = ['date', 'observation', 'location', 'as_of', 'target']
        rsv_target_data_cols = ['date', 'as_of', 'location', 'target', 'observation']
        if self.pathogen == 'flu':
            if missing_cols := (set(flu_target_data_cols) - set(self.target_data.columns)):
                raise ValueError(f"Input target data is missing required columns: {missing_cols}")
        elif self.pathogen == 'covid':
            if missing_cols := (set(covid_target_data_cols) - set(self.target_data.columns)):
                raise ValueError(f"Input target data is missing required columns: {missing_cols}")
        elif self.pathogen == 'rsv':
            if missing_cols := (set(rsv_target_data_cols) - set(self.target_data.columns)):
                raise ValueError(f"Input target data is missing required columns: {missing_cols}")
        self.target_data = clean_nan_values(self.target_data)


    def _check_locations_data_columns(self) -> None:
        # Check existence of required columns
        location_data_cols = ['abbreviation', 'location', 'location_name', 'population']
        if missing_cols := (set(location_data_cols) - set(self.locations_data.columns)):
            raise ValueError(f"Input location data is missing required columns: {missing_cols}")
        # Check esitence of required locations
        if missing_locations := (set(self.data['location']) - set(self.locations_data['location'])):
            raise ValueError(f"Input location data is missing data for locations {missing_locations}")
        
