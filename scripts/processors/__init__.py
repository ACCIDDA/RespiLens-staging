"""Dataset-specific processors for converting Hubverse datasets to RespiLens JSON."""

from .flusight import FlusightDataProcessor
from .rsv_forecast_hub import RSVDataProcessor
from .covid19_forecast_hub import COVIDDataProcessor
from .flu_metrocast_hub import FluMetrocastDataProcessor

__all__ = ["FlusightDataProcessor", "RSVDataProcessor", "COVIDDataProcessor", "FluMetrocastDataProcessor"]
