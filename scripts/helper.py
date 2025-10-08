"""Helper functions for data conversion process."""

import json 
import jsonschema
from typing import Literal
import numpy as np
import pandas as pd
from pathlib import Path

# Import schema
_current_dir = Path(__file__).parent
projections_schema_path = _current_dir / 'schemas' / 'RespiLens_projections.schema.json'
timeseries_schema_path = _current_dir / 'schemas' / 'RespiLens_timeseries.schema.json'
with open(projections_schema_path, 'r') as f:
    projections_schema = json.load(f)
with open(timeseries_schema_path, 'r') as f:
    timeseries_schema = json.load(f)


def clean_nan_values(df: pd.DataFrame) -> pd.DataFrame:
    """Purge dfs of JSON-incompatible `NaN` values."""
    return df.replace({np.nan: None})


def hubverse_df_preprocessor(df: pd.DataFrame, filter_quantiles: bool = True) -> pd.DataFrame: # can add **kwargs if we need modular quantile filtering
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
    if filter_quantiles:
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
        FileExistsError: If file already exists at the full output path and overwrite is set to False.
    """
    # Construct full target directory path (output_path / pathogen-ext)
    path_mapping = {
        "flu": "flusight",
        "rsv": "rsv",
        "covid": "covid19",
        "nhsn": "nhsn"
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


def validate_respilens_json(json_contents: dict, type: str = Literal['projections', 'timeseries']) -> bool | str:
    """
    Validate JSON output with RespiLens schema

    Args:
        json_contents: Contents of json file, stored as python dict
        type: Type of RespiLens data (either projections or timeseries)

    Returns:
        True if validation is successful, str of error message if unsuccessful.

    Raise:
        ValidationError: When json contents do not match jsonschema
    """
    if type == 'projections':
        try:
            jsonschema.validate(instance=json_contents, schema=projections_schema)
            return True
        except jsonschema.exceptions.ValidationError as e:
            return str(e)
    elif type == 'timeseries':
        try:
            jsonschema.validate(instance=json_contents, schema=timeseries_schema)
            return True
        except jsonschema.exceptions.ValidationError as e:
            return str(e)
    else:
        raise ValueError(f"`type` parameter must be one of 'projections' or 'timeseries'. Received {type}")


TEMP_NHSN_COLUMN_MASK = ['totalconfc19newadmadult',
                         'jurisdiction',
                         'weekendingdate',
                         'totalconfflunewadmadult',
                         'totalconfrsvnewadmadult',
                         'totalconfc19newadm',
                         'totalconfc19icupats',
                         'totalconffluicupats',
                         'totalconfrsvicupats',
                         'totalconfflunewadm',
                         'totalconfc19hosppats',
                         'totalconffluhosppats',
                         'totalconfrsvhosppats',
                         'totalconfc19newadmped',
                         'totalconfflunewadmped',
                         'totalconfrsvnewadmped',
                         'totalconfrsvnewadm',
                         'numconfc19newadmadult18to49',
                         'numconfc19newadmadult50to64',
                         'numconfc19newadmadult65to74',
                         'numconfc19newadmadult75plus',
                         'numconfc19icupatsadult',
                         'numconffluicupatsadult',
                         'numconfrsvicupatsadult',
                         'numconfflunewadmadult18to49',
                         'numconfflunewadmadult50to64',
                         'numconfflunewadmadult65to74',
                         'numconfflunewadmadult75plus',
                         'numconfc19hosppatsadult',
                         'numconffluhosppatsadult',
                         'numconfrsvhosppatsadult',
                         'numconfrsvnewadmadult18to49',
                         'numconfrsvnewadmadult50to64',
                         'numconfrsvnewadmadult65to74',
                         'numconfrsvnewadmadult75plus',
                         'numconfc19newadmunk',
                         'numconfflunewadmunk',
                         'numconffluhosppatsped',
                         'numconfc19newadmped0to4',
                         'numconfc19newadmped5to17',
                         'numconfc19icupatsped',
                         'numconffluicupatsped',
                         'numconfrsvicupatsped',
                         'numconfflunewadmped0to4',
                         'numconfflunewadmped5to17',
                         'numconfc19hosppatsped',
                         'numconfrsvhosppatsped',
                         'numconfrsvnewadmped0to4',
                         'numconfrsvnewadmped5to17',
                         'numconfrsvnewadmunk']

LOCATIONS_MAP = {'US': 'US',
 'AL': '01',
 'AK': '02',
 'AZ': '04',
 'AR': '05',
 'CA': '06',
 'CO': '08',
 'CT': '09',
 'DE': '10',
 'DC': '11',
 'FL': '12',
 'GA': '13',
 'HI': '15',
 'ID': '16',
 'IL': '17',
 'IN': '18',
 'IA': '19',
 'KS': '20',
 'KY': '21',
 'LA': '22',
 'ME': '23',
 'MD': '24',
 'MA': '25',
 'MI': '26',
 'MN': '27',
 'MS': '28',
 'MO': '29',
 'MT': '30',
 'NE': '31',
 'NV': '32',
 'NH': '33',
 'NJ': '34',
 'NM': '35',
 'NY': '36',
 'NC': '37',
 'ND': '38',
 'OH': '39',
 'OK': '40',
 'OR': '41',
 'PA': '42',
 'RI': '44',
 'SC': '45',
 'SD': '46',
 'TN': '47',
 'TX': '48',
 'UT': '49',
 'VT': '50',
 'VA': '51',
 'WA': '53',
 'WV': '54',
 'WI': '55',
 'WY': '56',
 'PR': '72'}