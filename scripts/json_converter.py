import copy
import json
import pandas as pd
from datetime import date, datetime
from pathlib import Path
# TODO: fix up location metadata jsonschema (in job_work dir)
    # remove location_metadata as an attribute?
# TODO: module-level docs, organize import statements

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

        location_metadata_path = Path(location_metadata_path)
        self.location_metadata = json.loads(location_metadata_path.read_text())

        data_path = Path(data_path)
        self.ext = data_path.suffix.lower()

        if self.ext == '.json': 
            pass

        elif self.ext == '.csv':
            self.data = pd.read_csv(data_path)
            columns = {col.lower(): col for col in self.data.columns}
            location_column_names = {"location", "locations"} 
            date_column_names = {"date", "dates"} 
            location_col = next((columns[col] for col in location_column_names if col in columns), None)
            date_col = next((columns[col] for col in date_column_names if col in columns), None)
            if not location_col or not date_col:
                raise KeyError("Input data must contain a 'location' and 'date' column.")
            # Store location and date column names
            self.location_col = location_col
            self.date_col = date_col
            

        else:
            raise ValueError(f"Unsupported file type: {self.ext}")
        

    def convert_to_ISO8601_date(self) -> None: # modifies data attribute to have correct date format
        """
        Converts dates to strs in ISO 8601 format.
        """

        if self.ext == '.csv':
            try:
                self.data[self.date_col] = pd.to_datetime(
                    self.data[self.date_col], 
                    errors='raise', 
                    infer_datetime_format=True
                ).dt.strftime('%Y-%m-%d')
            except Exception as e:
                raise ValueError(f"Failed to normalize dates in column '{self.date_col}': {e}")

        elif self.ext == '.json':
            pass



    def convert_from_csv(self) -> dict: # returns correctly formatted json
        """
        Converts external .csv data into RespiLens-formatted json data.

        Returns:
            A dict where each unique location has a RespiLens json entry.
        """

        # Create json to store the properly formatted data
        return_json = {}

        # Populate a json entry with properly formatted unique location data
        unique_locations = set(list(self.data[self.location_col]))
        for location in unique_locations:
            json_entry = copy.deepcopy(self.json_struct)
            json_entry["metadata"]["location"] = location # add loc to metadata header
            current_loc_df = self.data[self.data[self.location_col] == location]
            json_entry["series"]["dates"] = list(current_loc_df[self.date_col]) # add date range to dates key
            for column in current_loc_df.columns:
                if column in (self.location_col, self.date_col):
                    continue
                else:
                    json_entry["series"]["columns"][column] = list(current_loc_df[column])
            
            # Add to larger json
            return_json[location] = json_entry
        
        return return_json


    def convert_from_json(self) -> dict: # returns correctly formatted json
        """
        """

        pass