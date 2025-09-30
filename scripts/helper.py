"""Helper functions for data conversion process."""

import json 
from typing import Literal
import numpy as np
import pandas as pd
from pathlib import Path


def clean_nan_values(df: pd.DataFrame) -> pd.DataFrame:
    """Purge dfs of JSON-incompatible `NaN` values."""
    return df.replace({np.nan: None})


def hubverse_df_preprocessor(df: pd.DataFrame) -> pd.DataFrame: # can add **kwargs if we need modular quantile filtering
    """
    Do a number of pre-processing tasks that make a hubverse df ready to pass through a processing class.

    Args:
        df: Hubverse data as pd.DataFrame

    Returns:
        A df with... 
            - horizons as ints, 
            - horizon NaNs dropped, 
            - only some `output_type_id` values kept, 
            - all `output_type` == sample removed.
    """
    df = df.copy()
    # Drop NaN values in horizon column
    df = df.dropna(subset=['horizon'])
    # Ensure horizons are ints (not floats)
    df['horizon'] = df['horizon'].astype(int)
    # Get rid of all output_type == 'sample'
    df = df[df['output_type'] != 'sample']
    # Filter `output_type_id` values
    # Only keep some quantiles, if pmf is implicated keep all `output_type_id` values
    categorical_ids = ['decrease', 'increase', 'large_decrease', 'large_increase', 'stable'] 
    numeric_ids = [0.025, 0.25, 0.5, 0.75, 0.975]
    numeric_output_ids = pd.to_numeric(df['output_type_id'], errors='coerce')
    is_categorical_id = df['output_type_id'].isin(categorical_ids)
    is_numeric_id = numeric_output_ids.isin(numeric_ids)
    df = df[is_categorical_id | is_numeric_id]
    # Ensure quantile column is numeric (if output_type = quantile)
    quantile_mask = df['output_type'] == 'quantile'
    df.loc[quantile_mask, 'output_type_id'] = df.loc[quantile_mask, 'output_type_id'].astype(float)

    return df


def get_location_info(
        location_data: pd.DataFrame, 
        location: str, 
        value_needed: Literal['abbreviation', 'location_name', 'population']
) -> str:
    """
    Get a variety of location metadata information given the FIPS code of a location.

    Args:
        location_data: The df of location metadata
        location: FIPS code for location for which info will be retrieved ('US' for US)
        value_needed: Which piece of info to retrieve (one of 'abbreviation', 'location_name', 'population')

    Returns:
        The value requested (as a str)

    Raises:
        ValueError: 
            If the location FIPS code provided via `location` param is not in the location metadata
    """
    current_df = location_data[location_data['location'] == location]
    if current_df.empty:
        raise ValueError(f"Could not find location {location} in location data.")
    if value_needed == 'population':
        return int(current_df[value_needed].iloc[0])
    else:
        return str(current_df[value_needed].iloc[0])
    

def save_json_file( 
        pathogen: Literal['flu','rsv','covid'],
        output_path: str,
        output_filename: str,
        file_contents: dict,
        overwrite: bool
) -> None:
    """
    Save an already-validated JSON to output_path/pathogen-ext/file_name.json

    Args:
        pathogen: Type of data in JSON payload
        output_path: Path to top-levl saving directory
        output_filename: Full name of file to be saved 
        file_contents: Contents of file to be saved

    Returns:
        None

    Raises:
        FileExistsError: If file already exists at the full output path
    """
    # Construct full target directory path (output_path / pathogen-ext)
    path_mapping = {
        "flu": "flusight",
        "rsv": "rsv",
        "covid": "covid19"
    }
    sub_dir = path_mapping.get(pathogen)
    if not sub_dir:
         raise ValueError(f"Invalid pathogen ({pathogen}) provided; must be one of {list(path_mapping.keys())}")
    target_dir = Path(output_path) / sub_dir
    
    # Create dir, construct full path for the output file, fail if overwrite will occur
    target_dir.mkdir(parents=True, exist_ok=True)
    file_path = target_dir / output_filename
    if (not overwrite) and file_path.exists():
        raise FileExistsError(f"Error saving {output_filename}; file already found at {file_path}." 
                              f"Remove or move file and try again.")
    
    # Write output contents to file
    with open(file_path,'w') as of:
        json.dump(file_contents, of, indent=4)