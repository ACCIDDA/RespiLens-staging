"""Defines a class to store Hubverse data pre-conversion."""

from pathlib import Path
import pandas as pd
import re


class HubverseData:
    """
    Attributes:
        data_path: Path to data file to be converted (.csv or .parquet)
        pathogen: Pathogen the data describes (must be 'flu', 'covid', or 'rsv')
        data: Data to be converted, stored as a pd.DataFrame
        target_data: Target/ground truth data, converted and stored as a pd.DataFrame
        locations_data: Location metadata, converted and stored as a pd.DataFrame
    """
    def __init__(self, data_path: str, pathogen: str, target_data_path: str, locations_data_path: str):
        self.data_path = Path(data_path)
        self.pathogen = pathogen
        if self.pathogen not in ['flu', 'covid', 'rsv']:
            raise ValueError(f"--pathogen must be one of 'flu', 'covid', 'rsv'. Received: {self.pathogen}")

        # Checks/validations/establishments relating to data
        self._validate_path() 
        self.data = self._read_to_df()
        self._validate_columns()
        self._impute_model_name() # add model name as a column

        # Validate --target-data-path and read in as df
        self.target_data = self._target_data(target_data_path=Path(target_data_path))

        # Validate --locations-data-path and read in as df
        self.locations_data = self._locations_data(locations_data_path=Path(locations_data_path))


    def _validate_path(self) -> None:
        # Confirm path exists  
        if not self.data_path.exists():
            raise FileNotFoundError(f"The specified --data-path does not exist. Received: {self.data_path}")
        
        # Confirm path is not a directory
        if self.data_path.is_dir():
            raise IsADirectoryError(f"--data-path provided is a directory, must be a file. Received: {self.data_path}")


    def _read_to_df(self) -> pd.DataFrame:
        # Confirm correct file extension and read in as a pd.DataFrame
        if self.data_path.suffix == '.csv':
            try:
                data = pd.read_csv(self.data_path)
            except Exception as e:
                print(f"Error parsing .csv file into a pd.DataFrame: {e}")
        elif self.data_path.suffix == '.parquet':
            try:
                data = pd.read_parquet(self.data_path)
            except Exception as e:
                print(f"Error parsing .parquet file into a pd.DataFrame: {e}")
        else:
            raise ValueError(f"--data-path has incorrect file extension: {self.data_path.suffix}, must be .csv or .parquet")
        
        return data


    def _validate_columns(self) -> None:
        # Hard-coded correct columns by pathogen
        flu_columns = set(['reference_date', 'target', 'horizon', 'target_end_date', 'location', 'output_type', 'output_type_id', 'value'])
        covid_columns = set(['reference_date', 'target', 'horizon', 'target_end_date', 'location', 'output_type', 'output_type_id', 'value'])
        rsv_columns = set(['origin_date', 'target', 'horizon', 'location', 'age_group', 'output_type', 'output_type_id', 'value'])

        # Confirm by pathogen, confirm only one date per file (VERY IMPORTANT)
        if self.pathogen == 'rsv':
            if (missing_columns:= rsv_columns - set(self.data.columns)):
                raise KeyError(f"Input data missing columns {missing_columns}")
            if len(set(self.data['origin_date'])) > 1:
                raise ValueError(f"Must only have one origin_date per file, receieved {len(set(self.data['origin_date']))}")
        if self.pathogen == 'covid':
            if (missing_columns:= covid_columns - set(self.data.columns)):
                raise KeyError(f"Input data missing columns {missing_columns}")
            if len(set(self.data['reference_date'])) > 1:
                raise ValueError(f"Must only have one origin_date per file, receieved {len(set(self.data['reference_date']))}")
        if self.pathogen == 'flu':
            if (missing_columns:= flu_columns - set(self.data.columns)):
                raise KeyError(f"Input data missing columns {missing_columns}")
            if len(set(self.data['reference_date'])) > 1:
                raise ValueError(f"Must only have one origin_date per file, receieved {len(set(self.data['reference_date']))}")
            

    def _impute_model_name(self) -> None:
        # Get the filename from the path
        filename = Path(self.data_path).name
        
        # Define a regex pattern to help strip out the date: 'YYYY-MM-DD-'
        date_pattern = r"\d{4}-\d{2}-\d{2}-"
        
        # Split the filename by the pattern and take the last part
        # (everything that comes AFTER date_pattern)
        parts = re.split(date_pattern, filename)
        model_name = parts[-1]
        model_name = Path(model_name).stem # remove file ext
        
        # Broadcast as a column to self.data
        self.data['model_name'] = model_name


    def _target_data(self, target_data_path: Path) -> pd.DataFrame:
        # Validate path, confirm it is a file not a dir
        if not target_data_path.exists():
            raise FileNotFoundError(f"The specified --target-data-path does not exist. Received: {target_data_path}")
        if target_data_path.is_dir():
            raise IsADirectoryError(f"--target-data-path provided points to a directory, must be a file. Received: {target_data_path}")
        
        # TODO: Allow parquet ???
        # Ensure correct .csv extension 
        if target_data_path.suffix == '.csv':
            try:
                target_data = pd.read_csv(target_data_path)
            except Exception as e:
                print(f"Error parsing target data into pd.DataFrame: {e}")
        else:
            raise ValueError(f"--target-data-path must point to a file with .csv extension. Received: {target_data_path.suffix}")
        
        # Confirm correct columns
        # Hard-coded target-data columns by pathogen
        flu_columns = set(['as_of', 'target_end_date', 'location', 'observation', 'weekly_rate']) # using time-series.csv target data, requiring as_of for now (can ask Sara what she thinks when she comes back) # TODO
        rsv_columns = set([])
        covid_columns = set([])
        if self.pathogen == 'flu':
            if (missing_columns:= flu_columns - set(target_data.columns)):
                raise KeyError(f"target data missing columns {missing_columns}")
        elif self.pathogen == 'covid':
            pass
        elif self.pathogen == 'rsv':
            pass
        # TODO?? Add a check to ensure the right dates match? 

        return target_data
    

    def _locations_data(self, locations_data_path: Path) -> pd.DataFrame:
        # Validate path
        if not locations_data_path.exists():
            raise FileNotFoundError(f"The specified --locations-data-path does not exist. Received: {locations_data_path}")
        if locations_data_path.is_dir():
            raise IsADirectoryError(f"--locations-data-path provided ppoints to a directory, must be a file. Received: {locations_data_path}")
        
        # Ensure corrrect .csv extension
        if locations_data_path.suffix == '.csv':
            try: 
                locations_data = pd.read_csv(locations_data_path)
            except Exception as e:
                print(f"Error parsing locations data into a pd.DataFrame: {e}")
        else:
            raise ValueError(f"--locations-data-path must point to a file with .csv extension. Received: {locations_data_path.suffix}")
        
        # Confirm necessary columns 
        req_cols = set(['abbreviation', 'location', 'location_name', 'population'])
        if (missing_columns:= req_cols - set(locations_data.columns)):
            raise KeyError(f"locations data missing columns {missing_columns}")

        return locations_data
