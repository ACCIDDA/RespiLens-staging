"""Helper functions for data conversion process."""

import json 
from typing import Literal
import pandas as pd
from pathlib import Path

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
        file_contents: dict
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
    if file_path.exists():
        raise FileExistsError(f"Error saving {output_filename}; file already found at {file_path}." 
                              f"Remove or move file and try again.")
    
    # Write output contents to file
    with open(file_path,'w') as of:
        json.dump(file_contents, of, indent=4)