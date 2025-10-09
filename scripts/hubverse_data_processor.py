"""Compatibility wrapper around dataset-specific processors."""

from typing import Literal
import logging

import pandas as pd

from covid19_data_processor import COVIDDataProcessor
from flusight_data_processor import FlusightDataProcessor
from rsv_data_processor import RSVDataProcessor


logger = logging.getLogger(__name__)


PROCESSOR_MAP = {
    "flusight": FlusightDataProcessor,
    "rsv": RSVDataProcessor,
    "covid19": COVIDDataProcessor,
}


class HubverseDataProcessor:
    """Facade that mimics the legacy single-class interface."""

    def __init__(
        self,
        data: pd.DataFrame,
        locations_data: pd.DataFrame,
        target_data: pd.DataFrame,
        hub: Literal["rsv", "covid19", "flusight"],
    ) -> None:
        if hub not in PROCESSOR_MAP:
            raise ValueError(f"Hub must be one of {list(PROCESSOR_MAP)}. Received: {hub}")

        processor_cls = PROCESSOR_MAP[hub]
        self.processor = processor_cls(
            data=data,
            locations_data=locations_data,
            target_data=target_data,
        )
        self.output_dict = self.processor.output_dict
        self.intermediate_dataframes = getattr(self.processor, "intermediate_dataframes", {})
        logger.info("Success ✅")
