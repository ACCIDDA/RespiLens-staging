"""RespiLens processor for COVID-19 Hubverse exports."""

import pandas as pd

from hub_dataset_processor import HubDataProcessorBase, HubDatasetConfig


class COVIDDataProcessor(HubDataProcessorBase):
    def __init__(self, data: pd.DataFrame, locations_data: pd.DataFrame, target_data: pd.DataFrame):
        config = HubDatasetConfig(
            file_suffix="covid19",
            dataset_label="covid19 forecasts",
            ground_truth_value_key="wk inc covid hosp",
            ground_truth_date_column="date",
            ground_truth_target="wk inc covid hosp",
            ground_truth_min_date=pd.Timestamp("2023-10-01"),
        )
        super().__init__(
            data=data,
            locations_data=locations_data,
            target_data=target_data,
            config=config,
        )
