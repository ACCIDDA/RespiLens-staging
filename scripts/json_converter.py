"""
Module-level docs
"""

from pathlib import Path
import json
import copy
import logging
import pandas as pd
from typing import Literal
from jsonschema import validate
from jsonschema.exceptions import ValidationError
from typing import Literal
# this is for timeseries data only 
# TODO: write json portion 
# TODO: write main function
  # CLI
# TODO: module-level docs, organize import statements

LOCATION_METADATA_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Location Metadata",
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "location": {
        "description": "The FIPS code or 'US' for the nation.",
        "type": "string",
        "pattern": r"^(\d{2}|US)$"
      },
      "abbreviation": {
        "description": "The two-letter postal abbreviation.",
        "type": "string",
        "pattern": "^[A-Z]{2}$"
      },
      "name": {
        "description": "The full name of the location.",
        "type": "string",
        "minLength": 2
      },
      "population": {
        "description": "The estimated population.",
        "type": "integer",
        "minimum": 0
      }
    },
    "required": ["location", "abbreviation", "name", "population"]
  }
}

RESPILENS_DATA_SCHEMA = { 
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "RespiLens Time Series Data",
  "type": "object",
  "properties": {
    "metadata": {
      "type": "object",
      "properties": {
        "dataset": {
          "description": "The source of the dataset, e.g., CDC.",
          "type": "string",
          "minLength": 1
        },
        "location": {
          "description": "The two-letter abbreviation for the location.",
          "type": "string",
          "pattern": "^[A-Z]{2}$"
        },
        "series_type": {
          "description": "The type of data series, e.g., 'official'.",
          "type": "string",
          "minLength": 1
        }
      },
      "required": ["dataset", "location", "series_type"]
    },
    "series": {
      "type": "object",
      "properties": {
        "dates": {
          "description": "A list of dates in ISO 8601 format (YYYY-MM-DD).",
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "string",
            "format": "date"
          }
        },
        "columns": {
          "description": "A dictionary of data columns, where each key is a column name and each value is an array of numbers or nulls.",
          "type": "object",
          "additionalProperties": {
            "type": "array",
            "items": {
              "type": ["number", "null"]
            }
          }
        }
      },
      "required": ["dates", "columns"]
    }
  },
  "required": ["metadata", "series"]
}

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ExternalData:
    """
    Loads, validates, and converts external .csv or .json data into a RespiLens-compatible format.

    Attributes:
        json_struct: The RespiLens json structure template, to be recursively populated.
        location_metadata: Location metadata (json)
        ext: The file extension of input data
        data: The external data to be converted
        location_col: If converting from .csv, the name of the column that holds location info
        date_col: If converting from .csv, the  name of the column that holds date info
    """

    def __init__(self, data_path: str, location_metadata_path: str, dataset: str):
        """
        Initialize the ExternalData class.

        Args:
            data_path: Path to the external data to be converted to RespiLens format.
            location_metadata: json-style metadata for your locations. 
            dataset: What dataset the data is pulled from; e.g., 'CDC'
        """

        self.json_struct = {
            "metadata": {
                "dataset": f"{dataset}",
                "location": "",
                "series_type": "official"
            },
            "series": {
                "dates": [],
                "columns": {}
            }
        }

        data_path = Path(data_path)
        self.ext = data_path.suffix.lower()

        if self.ext == '.csv':
            # Ensure that .csv data contains a location and a date column 
            logger.info("Ensuring that .csv data contains a location and date column...")
            self.data = pd.read_csv(data_path)
            columns = {col.lower(): col for col in self.data.columns}
            location_column_names = {"location", "locations"} 
            date_column_names = {"date", "dates"} 
            location_col = next((columns[col] for col in location_column_names if col in columns), None)
            date_col = next((columns[col] for col in date_column_names if col in columns), None)
            # Stop execution if data does not contain 'date' or 'location' column
            if not location_col or not date_col:
                raise KeyError("Input data must contain a 'location' and 'date' column.")
            # Store location and date column names
            self.location_col = location_col
            self.date_col = date_col
            # Pad FIPS codes with a leading 0 if they are only 1 digit
            self.data[self.location_col] = self.data[self.location_col].astype(str).str.zfill(2)
            logger.info("Success.")
            # Re-format dates, if necessary
            self.convert_to_ISO8601_date()

            # Validate location metadata using jsonschema
            location_metadata_path = Path(location_metadata_path)
            self.location_metadata = json.loads(location_metadata_path.read_text())
            logger.info("Validating location metadata...")
            self.validate_jsonschema("location_metadata")
            logger.info("Success.")

            # Ensure locations in data match locations in metadata 
            # Create universal map from all possible identifiers to the abbreviation
            logger.info("Mapping various location identifiers to location abbreviations...")
            loc_identifier_to_abbrv_map = {}
            for entry in self.location_metadata:
                abbreviation = entry['abbreviation']
                # Add full location name as a key
                loc_identifier_to_abbrv_map[entry['name'].lower()] = abbreviation
                # Add locaiton FIPS code as a key
                loc_identifier_to_abbrv_map[entry['location']] = abbreviation
                # Addlocation abbreviation as a key
                loc_identifier_to_abbrv_map[entry['abbreviation'].lower()] = abbreviation
            logger.info("Success.")
            # Match locations in .csv to key/value pairs in universal map
            logger.info(f"Matching locations in '{self.location_col}' col to metadata...")
            loc_abbrv_list = self.data[self.location_col].astype(str).str.lower().map(loc_identifier_to_abbrv_map).tolist()
            # Add as a column to data
            self.data['abbreviation'] = loc_abbrv_list
            # Validate that all locations were successfully matched (no NaNs)
            if pd.isna(self.data['abbreviation']).any():
                locs_with_nans = self.data[pd.isna(self.data['abbreviation'])][self.location_col].unique()
                raise ValueError(f"Could not find a metadata abbreviation match for the following locations: {list(locs_with_nans)}")
            logger.info("Success.")

            # Convert validated DataFrame to RespiLens-formatted json
            self.RespiLens_data = self.convert_from_csv()

        elif self.ext == '.json': 
            # Dump json into dictionary
            with open(data_path, 'r') as file:
                self.data = json.load(file)
            
            # Check if json is already in RespiLens format, if it is not, attempt to convert to pd.DataFrame and convert that way
            logger.info("Validating json data...")
            try:
                self.validate_jsonschema("data")
            except ValueError as e:
                logger.info("json data not in RespiLens format, attempting to flatten into a DataFrame...")
                try:
                    # Convert json to pd.DataFrame with json_normalize() (uknown structure)
                    self.data = pd.json_normalize(self.data)
                    logger.info("json data successfully converted to a DataFrame.")
                    # Ensure that DataFrame contains a location and a date column
                    logger.info("Ensuring that DataFrame data contains a location and date column...")
                    columns = {col.lower(): col for col in self.data.columns}
                    location_column_names = {"location", "locations"} 
                    date_column_names = {"date", "dates"} 
                    location_col = next((columns[col] for col in location_column_names if col in columns), None)
                    date_col = next((columns[col] for col in date_column_names if col in columns), None)
                    # Stop execution if data does not contain 'date' or 'location' column
                    if not location_col or not date_col:
                        raise KeyError("Input data must contain a 'location' and 'date' column.")
                    # Store location and date column names
                    self.location_col = location_col
                    self.date_col = date_col
                    # Pad FIPS codes with a leading 0 if they are only 1 digit
                    self.data[self.location_col] = self.data[self.location_col].astype(str).str.zfill(2)
                    logger.info("Success.")
                    # Re-format dates, if necessary
                    self.convert_to_ISO8601_date()

                    # Validate location metadata using jsonschema
                    location_metadata_path = Path(location_metadata_path)
                    self.location_metadata = json.loads(location_metadata_path.read_text())
                    logger.info("Validating location metadata...")
                    self.validate_jsonschema("location_metadata")
                    logger.info("Success.")

                    # Ensure locations in data match locations in metadata 
                    # Create universal map from all possible identifiers to the abbreviation
                    logger.info("Mapping various location identifiers to location abbreviations...")
                    loc_identifier_to_abbrv_map = {}
                    for entry in self.location_metadata:
                        abbreviation = entry['abbreviation']
                        # Add full location name as a key
                        loc_identifier_to_abbrv_map[entry['name'].lower()] = abbreviation
                        # Add locaiton FIPS code as a key
                        loc_identifier_to_abbrv_map[entry['location']] = abbreviation
                        # Addlocation abbreviation as a key
                        loc_identifier_to_abbrv_map[entry['abbreviation'].lower()] = abbreviation
                    logger.info("Success.")
                    # Match locations in .csv to key/value pairs in universal map
                    logger.info(f"Matching locations in '{self.location_col}' col to metadata...")
                    loc_abbrv_list = self.data[self.location_col].astype(str).str.lower().map(loc_identifier_to_abbrv_map).tolist()
                    # Add as a column to data
                    self.data['abbreviation'] = loc_abbrv_list
                    # Validate that all locations were successfully matched (no NaNs)
                    if pd.isna(self.data['abbreviation']).any():
                        locs_with_nans = self.data[pd.isna(self.data['abbreviation'])][self.location_col].unique()
                        raise ValueError(f"Could not find a metadata abbreviation match for the following locations: {list(locs_with_nans)}")
                    logger.info("Success.")

                    # Convert validated DataFrame to RespiLens-formatted json
                    self.RespiLens_data = self.convert_from_csv()

                except: # TODO: determine which errors would be most common in the above process and catch that/those errors w except(s) logic
                    pass #raise lethal error

            # do the location_metadata schema validation, set as self.location_metadata
            # check that dates are properly formatted, if not, format them
            # try: validate json in case it is already respilens formatted
            # if not: convert to pd.DataFrame and create and attempt to convert to RL format
                # do all the necessary checks: loc and date col exist, location metdata mapping, etc. (maybe pull this stuff into an external func?)
            # fail if nothing works
            

        else:
            raise ValueError(f"Unsupported file type: {self.ext}")
        

    def validate_jsonschema(self, which_data: Literal['location_metadata', 'data']) -> None:
        """
        Validate json data using json schemas (constants defined outside of ExternalData class).

        Arguments:
            which_data: Whether the json to be validated is location metadata or RespiLens data
        """

        if which_data == 'location_metadata':
            try:
                validate(instance=self.location_metadata, schema=LOCATION_METADATA_SCHEMA)
            except ValidationError as e:
                raise ValueError(f"Location metadata does not comply with RespiLens standard. Failing on error: {e}")
        elif which_data == 'data': # TODO: call this from main to confirm
            try:
                validate(instance=self.data, schema=RESPILENS_DATA_SCHEMA)
            except ValidationError as e:
                raise ValueError(f"json data does not comply with RespiLens standard. Failing on error: {e}")
        else:
            raise ValueError(f"which_data argument must be either 'location_metdata' or 'data'; receieved {which_data}.")


    def convert_to_ISO8601_date(self) -> None: 
        """
        Converts self.data dates to strs in ISO 8601 format.
        """

        logger.info("Converting dates into ISO 8601 strings...")
        try:
            self.data[self.date_col] = pd.to_datetime(
                self.data[self.date_col], 
                errors='raise', 
                format='mixed'
            ).dt.strftime('%Y-%m-%d')
        except Exception as e:
            raise ValueError(f"Failed to normalize dates in column '{self.date_col}': {e}")
        logger.info("Success.")


    def convert_from_csv(self) -> dict: 
        """
        Converts external .csv data into RespiLens-formatted json data.

        Returns:
            A dict where each unique location has a RespiLens json entry.
        """

        # Create json to store the properly formatted data
        return_json = {}

        logger.info("Converting data to RespiLens json format...")
        # Populate a json entry with properly formatted unique location data
        unique_locations = set(list(self.data['abbreviation'])) 
        for location_abbrv in unique_locations:
            json_entry = copy.deepcopy(self.json_struct)
            json_entry["metadata"]["location"] = location_abbrv # add loc to metadata header
            current_loc_df = self.data[self.data['abbreviation'] == location_abbrv]
            json_entry["series"]["dates"] = list(current_loc_df[self.date_col]) # add date range to dates key
            for column in current_loc_df.columns:
                if column in (self.location_col, self.date_col, 'abbreviation'):
                    continue
                else:
                    json_entry["series"]["columns"][column] = list(current_loc_df[column])
            
            # Add to larger json
            return_json[location_abbrv] = json_entry
        
        logger.info("Success.")
        return return_json