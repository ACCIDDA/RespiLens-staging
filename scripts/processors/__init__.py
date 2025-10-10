"""Dataset-specific processors for converting Hubverse datasets to RespiLens JSON."""

from .flusight import FlusightDataProcessor
from .rsv_forecast_hub import RSVDataProcessor
from .covid19_forecast_hub import COVIDDataProcessor

__all__ = ["FlusightDataProcessor", "RSVDataProcessor", "COVIDDataProcessor"]
