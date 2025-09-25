"""
Dynamically loads the RespiLens projections JSON schema.

This module provides a single constant, `SCHEMA`, which contains the
loaded RespiLens projections schema as a Python dictionary. It locates
the schema file relative to its own path, making it robust to changes
in the current working directory.
"""

import json
from pathlib import Path

# 1. Get the directory containing this script (/.../projections_data_converter/)
#    Path(__file__) is the path to the current file.
#    .parent gives you the directory it's in.
current_dir = Path(__file__).parent

# 2. Build the path to the schema file by navigating from the current directory.
#    current_dir.parent gets you to /.../scripts/
#    Then we navigate into the 'schemas' folder.
schema_path = current_dir.parent / 'schemas' / 'RespiLens_projections.schema.json'

# 3. Open the file, load its JSON contents, and store it in the SCHEMA constant.
with open(schema_path, 'r') as f:
    SCHEMA = json.load(f)
