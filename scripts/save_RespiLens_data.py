"""
Script for saving RespiLens data locally.

Functions:
    save_data: Saves data at specified output path; titled <locationabbrv>.json.
"""

import json
import logging
import os
from jsonschema import validate
from jsonschema.exceptions import ValidationError
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
with open(SCRIPT_DIR / "respilens-data.schema.json", "r") as f:
    RESPILENS_DATA_SCHEMA = json.load(f)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def save_data(data: dict, output_path: str | Path) -> None:
    """
    Function to save RespiLens data to a local directory.

    Args:
        data: RespiLens-formatted json data to be saved.
        output_path: Path to directory where data will be saved.
    """
    # Ensure directory exists
    logger.info("Validating path...")
    output_path = Path(output_path)
    os.makedirs(output_path, exist_ok=True)
    logger.info("Success.")
    # Validate data with RespiLens jsonschema
    logger.info("Validating json data structure...")
    try:
        validate(instance=data, schema=RESPILENS_DATA_SCHEMA)
    except ValidationError as e:
        raise ValueError("Data does not match RespiLens jsonschema.") from e
    logger.info("Success.")

    # Save data 
    output_file = os.path.join(output_path, f"{data["metadata"]["location"]}.json")
    with open(output_file, "w") as data_json_file:
        json.dump(data, data_json_file, indent=4)
