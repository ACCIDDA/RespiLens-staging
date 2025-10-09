"""
Class to process FluSight data (pd.DataFrame) into RespiLens-style JSON output.
"""

import pandas as pd

from hub_dataset_processor import HubDataProcessorBase, HubDatasetConfig


class FlusightDataProcessor(HubDataProcessorBase):
    def __init__(self, data: pd.DataFrame, locations_data: pd.DataFrame, target_data: pd.DataFrame):
        config = HubDatasetConfig(
            file_suffix="flusight",
            dataset_label="flusight forecasts",
            ground_truth_value_key="wk inc flu hosp",
            ground_truth_date_column="target_end_date",
            ground_truth_target=None,
            ground_truth_min_date=pd.Timestamp("2023-10-01"),
        )
        super().__init__(
            data=data,
            locations_data=locations_data,
            target_data=target_data,
            config=config,
        )
