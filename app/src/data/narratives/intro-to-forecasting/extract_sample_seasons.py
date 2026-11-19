"""
One-off snapshot for the "To the end of the season" slide: a few whole sample
seasons from the Flu MetroCast long-term ensemble's forecast of the narrative's
date, so the slide can show single plausible seasons next to the median.

Run it once, by hand, and commit the output: the narrative reads its data as of
a fixed date, so this snapshot is never refreshed by the data pipeline.

    python extract_sample_seasons.py /path/to/flu-metrocast

The samples kept are drawn at random (with a fixed seed, so a rerun keeps
the same ones): no selection, so they look like the forecast does. Beside
them goes the ensemble's peak forecast, from all its samples: the quantiles
of each season's highest value and of the week it falls in.
"""

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
LEVELS = {"q025": 0.025, "q25": 0.25, "median": 0.5, "q75": 0.75, "q975": 0.975}


def peak_forecast(wide: pd.DataFrame) -> dict:
    """Quantiles of the samples' peak size, and of their peak week (dates, nearest sample)."""
    sizes = wide.max(axis=1)
    # Each sample's peak week, as a position in the season (its first highest week)
    weeks = pd.Series(wide.to_numpy().argmax(axis=1), index=wide.index)
    dates = [str(pd.Timestamp(date).date()) for date in wide.columns]
    return {
        "size": {key: round(float(sizes.quantile(level)), 4) for key, level in LEVELS.items()},
        "week": {key: dates[int(weeks.quantile(level, interpolation="nearest"))] for key, level in LEVELS.items()},
    }


def pick_sample_seasons(df: pd.DataFrame, count: int, seed: int) -> dict:
    """{location: {target: {"dates": [...], "samples": [[...], ...], "peak": {...}}}} from sample rows."""
    seasons = {}
    for (location, target), group in df[df["output_type"] == "sample"].groupby(["location", "target"]):
        wide = (
            group.pivot_table(index="output_type_id", columns="target_end_date", values="value", aggfunc="first")
            .sort_index(axis=1)
            .dropna()
        )
        if wide.empty:
            continue
        # The same draw for every location and target, so a rerun is identical
        rng = np.random.default_rng(seed)
        drawn = rng.choice(len(wide), size=min(count, len(wide)), replace=False)
        seasons.setdefault(str(location), {})[str(target)] = {
            "dates": [str(pd.Timestamp(date).date()) for date in wide.columns],
            "samples": [[round(float(value), 2) for value in wide.iloc[row]] for row in sorted(drawn)],
            "peak": peak_forecast(wide),
        }
    return seasons


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("hub_path", help="Local clone of https://github.com/reichlab/flu-metrocast")
    parser.add_argument("--reference-date", default="2026-10-31", help="The forecast to take samples from")
    parser.add_argument("--model", default="epiENGAGE-ensemble_long")
    parser.add_argument("--count", type=int, default=30, help="Sample seasons to keep per location and target")
    parser.add_argument("--seed", type=int, default=2026, help="Seed of the random draw")
    parser.add_argument("--output", default=str(HERE / "sample-seasons.json"))
    args = parser.parse_args()

    folder = Path(args.hub_path) / "model-output" / args.model
    stem = f"{args.reference_date}-{args.model}"
    source = next((folder / f"{stem}{ext}" for ext in (".parquet", ".csv") if (folder / f"{stem}{ext}").exists()), None)
    if source is None:
        raise SystemExit(f"No {stem}.parquet or .csv in {folder}")
    df = pd.read_parquet(source) if source.suffix == ".parquet" else pd.read_csv(source)

    snapshot = {
        "model": args.model,
        "reference_date": args.reference_date,
        "source": f"reichlab/flu-metrocast model-output/{args.model}/{source.name}",
        "seed": args.seed,
        "locations": pick_sample_seasons(df, args.count, args.seed),
    }
    if not snapshot["locations"]:
        raise SystemExit(f"{source.name} has no sample rows")
    Path(args.output).write_text(json.dumps(snapshot, separators=(",", ":")))
    print(f"Saved {len(snapshot['locations'])} locations to {args.output}")


if __name__ == "__main__":
    main()
