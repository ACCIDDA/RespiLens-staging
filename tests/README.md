# Projection Parity Test

This directory contains a minimal FluSight sample dataset that exercises both forecast and rate-change targets for two models (`FluSight-ensemble`, `UNC_IDD-Influpaint`).

Run the parity script to ensure the Python and R conversion pipelines yield identical JSON (ignoring the metadata timestamp):

```bash
./tests/run_projection_parity_test.sh
```

Requirements:
- Python environment with the dependencies for `scripts/external_to_projections.py`
- R (≥ 4.0) with packages `jsonlite`, `jsonvalidate`, and `arrow`

The script writes outputs under `tests/output/python` and `tests/output/r`, then uses a Python assertion to compare the JSON payloads directly (metadata timestamps are ignored).
