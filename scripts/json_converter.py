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
        json_struct: The RespiLens JSON structure template, to be recursively populated.
        location_metadata: Location metadata (JSON)
        ext: The file extension of input data
        data: The external data to be converted
        location_col: The name of the column that holds location info
        date_col: The  name of the column that holds date info
        RespiLens_data: Correctly formatted RespiLens JSON data
    """

    def __init__(self, data_path: str, location_metadata_path: str, dataset: str):
        """
        Initialize the ExternalData class.

        Args:
            data_path: Path to the external data to be converted to RespiLens format.
            location_metadata: JSON-style metadata for your locations. 
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

            # Convert validated DataFrame to RespiLens-formatted JSON, confirm it is valid RespiLens data (final validation step)
            self.RespiLens_data = self.convert_from_df()
            logger.info("Validating final RespiLens JSON data...")
            for location_entry in self.RespiLens_data.keys():
                try:
                    validate(instance=self.RespiLens_data[location_entry], schema=RESPILENS_DATA_SCHEMA)
                except ValidationError as e:
                    raise ValueError(f"Final RespiLens JSON did not match jsonschema. First failed location entry is {location_entry}.") from e
            logger.info("Success.")

        elif self.ext == '.json': 
            # Dump JSON into dictionary
            with open(data_path, 'r') as file:
                self.data = json.load(file)
            
            # Check if JSON is already in RespiLens format, if it is not, attempt to convert to pd.DataFrame and convert that way
            logger.info("Validating JSON data...")
            try:
                self.validate_jsonschema("data")
            except ValueError as e:
                logger.info("JSON data not in RespiLens format, attempting to flatten into a DataFrame...")
                try:
                    # Convert JSON to pd.DataFrame with json_normalize() (uknown structure)
                    self.data = pd.json_normalize(self.data)
                    logger.info("JSON data successfully converted to a DataFrame.")
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

                    # Convert validated DataFrame to RespiLens-formatted JSON, confirm it is valid RespiLens data (final validation step)
                    self.RespiLens_data = self.convert_from_df()
                    logger.info("Validating final RespiLens JSON data...")
                    for location_entry in self.RespiLens_data.keys():
                        try:
                            validate(instance=self.RespiLens_data[location_entry], schema=RESPILENS_DATA_SCHEMA)
                        except ValidationError as e:
                            raise ValueError(f"Final RespiLens JSON did not match jsonschema. First failed location entry is {location_entry}.") from e
                    logger.info("Success.")

                except (ValueError, TypeError) as e:
                    logger.error("Data processing failed due to a format or type error.")
                    raise ValueError(f"Could not process data on error. Check JSON structure, date formats, or location identifiers.") from e
                except (json.JSONDecodeError, pd.errors.ParserError) as e:
                    logger.error("Failed to convert JSON into DataFrame. JSON may be malformed or have complex nested structure that is not convertible using pd.json_normalize().")
                    raise pd.errors.ParserError(f"Could not flatten JSON data into a tabular format.") from e
                except Exception as e:
                    logger.error("An unexpected error occurred during the data conversion process.")
                    raise RuntimeError("Unexpected failure during data conversion.") from e
            

        else:
            raise ValueError(f"Unsupported file type: {self.ext}")
        

    def validate_jsonschema(self, which_data: Literal['location_metadata', 'data']) -> None:
        """
        Validate JSON data using jsonschemas (constants defined outside of ExternalData class).

        Arguments:
            which_data: Whether the JSON to be validated is location metadata or RespiLens data
        """

        if which_data == 'location_metadata':
            try:
                validate(instance=self.location_metadata, schema=LOCATION_METADATA_SCHEMA)
            except ValidationError as e:
                logger.info("Cannot proceed with data conversion if location metadata does not match RespiLens standard.")
                raise ValueError("Location metadata does not comply with RespiLens standard.") from e
        elif which_data == 'data': 
            try:
                validate(instance=self.data, schema=RESPILENS_DATA_SCHEMA)
            except ValidationError as e:
                raise ValueError(f"JSON data does not comply with RespiLens standard.") from e
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
        except (ValueError, TypeError) as e:
            raise ValueError(f"Failed to normalize dates in column '{self.date_col}'. Ensure all dates are in recognizable format.") from e
        logger.info("Success.")


    def convert_from_df(self) -> dict: 
        """
        Converts external .csv data into RespiLens-formatted JSON data.

        Returns:
            A dict where each unique location has a RespiLens JSON entry.
        """

        # Create JSON to store the properly formatted data
        return_json = {}

        logger.info("Converting data to RespiLens JSON format...")
        # Populate a JSON entry with properly formatted unique location data
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
            
            # Add to larger JSON
            return_json[location_abbrv] = json_entry
        
        logger.info("Success.")
        return return_json