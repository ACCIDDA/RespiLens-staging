# RespiLens Scripts [respilens-logo](https://github.com/user-attachments/assets/f4b54c2a-9d27-4453-9a85-72b1b2f965a2)

In this README.md, you will find brief guides for [RespiLens'](https://www.RespiLens.com) scripts. Jump to the script you're looking for below:

* [external_to_projections](external_to_projections)
* [process_flusight_data](process_flusight_data)
* [process_nhsn_data](process_nhsn_data)
* [process_rsv_data](process_rsv_data)
* [process_cdc_data](process_cdc_data)
* [validation_plots](validation_plots)
* [validation_plots_rsv](validation_plots_rsv)
* [json_converter](json_converter)
* [save_respilens_data](save_respilens_data)
* [metadata_builder](metadata_builder)


## process_flusight_data

#### Overview

This script processes raw influenza hospitalization forecast and groundtruth data from the [CDC's FluSight Forecast Hub](https://github.com/cdcepi/FluSight-forecast-hub) and converts it to structured JSON files. For each run, a `metadata.json` file is generated, and for each location, a separate JSON file (e.g., `NC_flusight.json` for North Carolina) is generated. This file includes:

* Location-specific metadata.
* The ground truth data for that location.
* All the processed forecast data from every model for that location.
* A list of models that have provided forecasts for that specific location.

#### Running `process_flusight_data.py`

You can run `process_flusight_data.py` with the following options:

| Option | Description | Value Type | Required? | Default Value |
| :--- | :--- | :--- | :--- | :--- |
| `--hub-path` | Sets the file path to the root directory of the FluSight forecast hub data. | String | No | `'./FluSight-forecast-hub'` |
| `--output-path` | Sets the file path where the processed JSON output files will be saved. | String | No | `'./processed_data'` |
| `--demo` | A flag to run the script in a faster "demo" mode, processing a limited subset of models. | Flag (Boolean) | No | `False` |
| `--log-level` | Sets the console logging verbosity. Choices are `DEBUG`, `INFO`, `WARNING`, `ERROR`. | String | No | `'INFO'` |

Example command:
```
python process_flusight_data.py --hub-path ./FluSight-forecast-hub --output-path ./processed_data
```


## process_nhsn_data

#### Overview

This script is designed to download, process, and save COVID-19 hospitalization data from the CDC's National Healthcare Safety Network (NHSN). For each location, a separate JSON file (e.g., `VA_nhsn.json` for Virginia) is generated, with metadata embedded. These files are saved in two locations; `RespiLens/processed_data/nhsn/` and `app/public/processed_data/nhsn/`. 

#### Running `process_nhsn_data.py`

You can run `process_nhsn_data.py` with the following options:

| Option | Description | Value Type | Required? | Default Value |
| :--- | :--- | :--- | :--- | :--- |
| `--output-path` | Sets the file path where the processed JSON output files will be saved. | String | No | `'./processed_data'` |
| `--locations-path`| Sets the file path to the `locations.csv` file, which contains metadata about the locations. | String | Yes | *N/A* |

Example command:
```
python process_nhsn_data.py --locations-path ./FluSight-forecast-hub/auxiliary-data/locations.csv --output-path ./processed_data
```

## process_rsv_data

#### Overview

This script is designed to process RSV hospitalization forecast data from the [RSV Forecast Hub](https://github.com/HopkinsIDD/rsv-forecast-hub). It reads raw forecast files (in Parquet format) and ground truth data, standardizes it, and aggregates the data into specific age groups. The primary output is a collection of JSON files saved to a single directory at `<output_path>/rsvforecasthub/`. This output includes a `metadata.json` file, and a separate JSON file for each location (e.g., `GA_rsvforecasthub.json`) containing its specific ground truth and forecast data, structured for use in visualizations.

#### Running `process_rsv_data.py`

You can run `process_rsv_data.py` with the following options:

| Option | Description | Value Type | Required? | Default Value |
| :--- | :--- | :--- | :--- | :--- |
| `--hub-path` | Sets the file path to the root directory of the RSV forecast hub data. | String | No | `'./rsv-forecast-hub'` |
| `--output-path` | Sets the file path where the processed JSON output files will be saved. | String | No | `'./processed_data'` |
| `--demo` | A flag to run the script in a faster "demo" mode. The script's code does not currently define any specific demo behavior. | Flag (Boolean) | No | `False` |
| `--log-level` | Sets the console logging verbosity. Choices are `DEBUG`, `INFO`, `WARNING`, `ERROR`. | String | No | `'INFO'` |

Example command:
```
python process_rsv_data.py --hub-path ./rsv-forecast-hub --output-path ./processed_data
```


## process_cdc_data

#### Overview

This script downloads specific datasets from the CDC's public data API. Based on a user-provided resource ID, it fetches the corresponding time-series data and its metadata. The script can then save this data locally into a specified output directory within a subdirectory named `nhsn/`. It gives the user the option to save the data in either `.csv` or `.json` format, or both. When saving, it creates a separate data file for each geographical jurisdiction found in the dataset (e.g., `CA.json`, `NY.json`) and also generates a single `metadata.json` file for the entire dataset and saves it in the same directory.

The `.json` files created and/or saved with `process_cdc_data.py` are compliant with the RespiLens JSON format. 

#### Running `process_cdc_data.py`

You can run `process_cdc_data.py` with the following options:

| Option | Description | Value Type | Required? | Default Value |
| :--- | :--- | :--- | :--- | :--- |
| `--resource-id` | The unique identifier string for the CDC dataset you want to download. | String | Yes | *N/A* |
| `--output-path` | The path to the parent directory where the output data folder will be saved. | String | Yes | *N/A* |
| `--output-format`| The file format(s) for saving the data. Can specify `json`, `csv`, or both. | String(s) | Yes | *N/A* |
| `--replace-column-names` | Flag to replace the API's short column names with more descriptive long names. | Flag (Boolean) | No | `True` |
| `--dont-replace-column-names` | Flag to keep the API's original short column names. | Flag (Boolean) | No | `False` |

Example command:
```
python process_cdc_data.py --resource-id vbim-akqf --output-path ./data/cdc_output --output-format json csv
```


## validation_plots

#### Overview

This script is a data visualization tool designed to validate the processed FluSight forecast data. It reads the JSON files created by `process_flusight_data.py` and generates a series of plots to visually compare the FluSight-ensemble model's forecasts against the actual ground truth data. For each location, it creates a two-part plot: the top part shows the time-series of actual hospitalizations with forecast predictions overlaid, and the bottom part displays a bar chart of the predicted rate-change categories ('increase', 'stable', or 'decrease'). The script outputs these plots as individual PDF files, one for each location (e.g., `SC_validation.pdf`), saving them all into a user-specified output directory.

#### Running `validation_plots.py`

You can run `validation_plots.py` with the following options:

| Option | Description | Value Type | Required? | Default Value |
| :--- | :--- | :--- | :--- | :--- |
| `--data-dir` | The directory where the processed JSON forecast payloads are located. | String | Yes | *N/A* |
| `--output-dir` | The directory where the output validation PDF files will be saved. | String | Yes | *N/A* |
| `--log-level` | Sets the console logging verbosity. Choices are `DEBUG`, `INFO`, `WARNING`, `ERROR`. | String | No | `'INFO'` |

Example command:
```
python validation_plots.py --data-dir ./processed_data/flusight --output-dir ./validation_output
```


## validation_plots_rsv

#### Overview

This script is a data visualization tool used to validate the processed RSV forecast data. It takes the JSON files generated by `process_rsv_data.py` and creates a set of plots for each location. Each plot is broken down into four age groups and visually compares the hub-ensemble model's forecasts against the ground truth hospitalization data for that group. The script then saves these multi-part plots as individual PDF files (e.g., `NE_rsv_validation.pdf`) into a user specified output directory.

#### Running `validation_plots_rsv.py`

You can run `validation_plots_rsv.py` with the following options:

| Option | Description | Value Type | Required? | Default Value |
| :--- | :--- | :--- | :--- | :--- |
| `--data-dir` | The directory where the processed RSV JSON payloads are located. | String | Yes | *N/A* |
| `--output-dir` | The directory where the output validation PDF files will be saved. | String | Yes | *N/A* |

Example command:
```
python validation_plots_rsv.py --data-dir ./processed_data/rsvforecasthub --output-dir ./validation_output
```


## json_converter

#### Overview

This script takes in a single `.csv` file or a directory containing `.csv` files and attempts to conver them to the RespiLens JSON format (one `.json` file per location; e.g. `MN.json`), then attempts to save the JSON files locally. The conversion process stipulates that users submit `.csv` files have both a column titled `location` and a column titled `date`, as well as supporting location metadata to match the locations specified in their CSV. When saving to an output directory, it is important to note that `json_converter.py` will not overwrite pre-existing files of the same name (e.g., if there is already a `MN.json` file in the saving directory, if the script attempts to save another `MN.json` to this directory it will fail.)

#### Running `json_converter.py`

You can run `json_converter.py` with the following options:

| Option | Description | Value Type | Required? | Default Value |
| :--- | :--- | :--- | :--- | :--- |
| `--data-path` | Path to data, either a single file or directory with multiple files. File(s) must be CSVs. | String | Yes | *N/A* |
| `--location-metadata-path`| Path to location metadata (must be a single JSON file). | String | Yes | *N/A* |
| `--dataset` | What dataset the data is pulled from (for metadata purposes). | String | Yes | *N/A* |
| `--output-path` | Path to directory to save data to. | String | Yes | *N/A* |

Example command:
```
python convert_to_respilens.py \
    --data-path ../input_data/weekly_flu_cases.csv \
    --location-metadata-path ../metadata/us_states_metadata.json \
    --dataset "Weekly_Influenza_Report" \
    --output-path ../output_data/flu_json
```


## save_respilens_data

#### Overview

This script contains two functions that work to save data locally:

* `save_data(data: dict, output_path: str | pathlib.Path)`
    - This function takes in JSON-style data, validates it against the RespiLens JSON standard, then saves it to the specified output path. There is no CLI for this function.
* `save_metadata(metadata: dict, output_path: str | pathlib.Path)`
    - This function takes in JSON-style metadata and saves it to the specified output path. There is no CLI for this function. 


## metadata_builder

#### Overview

This script contains one function called `metadata_builder(...)` that builds RespiLens-style metadata for a group/file/payload of data. `metadata_builder(...)` takes in the following four arguments:

| Argument | Description | Value Type | Required? | Default Value |
| :--- | :--- | :--- | :--- | :--- |
| `shortName` | Short or abbreviated name of the dataset the data was pulled from. | String | No | `""` |
| `fullName` | Full name of the dataset the data was pulled from. | String | No | `""` |
| `defaultView` | Which view the data belongs in. | String | No | `""` |
| `datasetType` | The type of data. | String | No | `""` |

There is an additionaly key of RespiLens metadta, `lastUpdated`, that is automatically filled in as a str of the current date. There is no CLI for this function. 
## external_to_projections

#### Overview

`external_to_projections.py` is the command-line entry point for converting Hubverse exports into RespiLens projections JSON files. It pulls raw forecast, target, and location metadata files; validates the inputs; runs the appropriate processor (`processors.flusight`, `processors.rsv_forecast_hub`, or `processors.covid19_forecast_hub`); validates the JSON outputs; and writes a single JSON file per location (plus metadata) using `helper.save_json_file`.

Internally it relies on `external_data.py` to load and validate the incoming files, and on `hub_dataset_processor.HubDataProcessorBase` for the shared processing workflow. Intermediate DataFrames are retained on each processor instance under the `intermediate_dataframes` attribute for optional downstream use.

#### Typical Workflow

1. Gather the three Hubverse exports for your pathogen:
   * `--data-path`: Forecast CSV containing quantiles/pmf predictions.
   * `--target-data-path`: Ground-truth time series (CSV or Parquet, depending on the hub).
   * `--locations-data-path`: Location metadata CSV.
2. Pick the pathogen (`flu`, `rsvforecasthub`, or `covid19forecasthub`) so the loader can enforce pathogen-specific column requirements.
3. Run the CLI pointing at the directory where processed JSON should be written.
4. Each payload is checked against `schemas/RespiLens_projections.schema.json` before being saved via `helper.save_json_file`.
5. Each processor exposes `processor.intermediate_dataframes` if you need to inspect the cleaned DataFrames in downstream tooling.

#### Running `external_to_projections.py`

You can run `external_to_projections.py` with the following options:

| Option | Description | Value Type | Required? | Default Value |
| :--- | :--- | :--- | :--- | :--- |
| `--output-path` | Directory where JSON files will be saved. | String | Yes | *N/A* |
| `--pathogen` | Pathogen to process (`flu`, `rsvforecasthub`, or `covid19forecasthub`). Determines which processor is used. | String | Yes | *N/A* |
| `--data-path` | Absolute path to Hubverse forecast data in CSV format. | String | Yes | *N/A* |
| `--target-data-path` | Absolute path to Hubverse target data (CSV or Parquet). | String | Yes | *N/A* |
| `--locations-data-path` | Absolute path to the location metadata CSV. | String | Yes | *N/A* |
| `--overwrite` | Flag that allows overwriting existing output files. | Flag (Boolean) | No | `False` |
| `--log-level` | Console logging verbosity (`DEBUG`, `INFO`, `WARNING`, `ERROR`). | String | No | `INFO` |

Example command:
```
python scripts/external_to_projections.py \
    --output-path ./app/public/processed_data \
    --pathogen flu \
    --data-path /absolute/path/to/FluSight-forecast-hub/hub_data.csv \
    --target-data-path /absolute/path/to/FluSight-forecast-hub/target-data/time-series.csv \
    --locations-data-path /absolute/path/to/FluSight-forecast-hub/auxiliary-data/locations.csv \
    --overwrite
```

To process other hubs, adjust the pathogen flag and the file paths:

```bash
# RSV Forecast Hub
python scripts/external_to_projections.py \
    --output-path ./app/public/processed_data \
    --pathogen rsvforecasthub \
    --data-path /absolute/path/to/rsv-forecast-hub/hub_data.csv \
    --target-data-path /absolute/path/to/rsv-forecast-hub/target-data/time-series.parquet \
    --locations-data-path /absolute/path/to/rsv-forecast-hub/auxiliary-data/locations.csv \
    --overwrite

# COVID-19 Forecast Hub
python scripts/external_to_projections.py \
    --output-path ./app/public/processed_data \
    --pathogen covid19forecasthub \
    --data-path /absolute/path/to/covid19-forecast-hub/hub_data.csv \
    --target-data-path /absolute/path/to/covid19-forecast-hub/target-data/time-series.parquet \
    --locations-data-path /absolute/path/to/covid19-forecast-hub/auxiliary-data/locations.csv \
    --overwrite
```

The CLI writes each pathogen into its own subdirectory under `--output-path` (`flusight`, `rsvforecasthub`, `covid19forecasthub`), so you can run it multiple times in a row without cleaning between runs.

#### R implementation (`external_to_projections.R`)

If you prefer R, run the companion script with the same flags:

```
Rscript scripts/external_to_projections.R \
    --output-path ./app/public/processed_data \
    --pathogen flu \
    --data-path /absolute/path/to/FluSight-forecast-hub/hub_data.csv \
    --target-data-path /absolute/path/to/FluSight-forecast-hub/target-data/time-series.csv \
    --locations-data-path /absolute/path/to/FluSight-forecast-hub/auxiliary-data/locations.csv \
    --overwrite
```

Swap the paths/pathogen exactly as in the Python example for RSV and COVID-19 Forecast Hubs (use `--pathogen rsvforecasthub` or `--pathogen covid19forecasthub`). Install dependencies once per machine:

```r
install.packages(c("jsonlite", "jsonvalidate", "arrow"))
```

The R script mirrors the Python pipeline: it validates inputs, converts them using the shared processing logic, and writes one JSON file per location (plus `metadata.json`) under `app/public/processed_data/<pathogen>/`. If the optional `jsonvalidate` package is installed, schema checks are applied; otherwise the script skips them with a warning.
