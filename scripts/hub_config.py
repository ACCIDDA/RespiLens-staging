"""Read the forecast cutoff offset once when processing a hub."""

import json
from pathlib import Path


def read_forecast_line_offset(hub_path):
    """Find a consistent submissions_due.end in nested hub task configuration."""
    tasks_path = Path(hub_path) / "hub-config" / "tasks.json"
    with tasks_path.open() as handle:
        tasks = json.load(handle)

    offsets = set()

    def visit(node):
        if isinstance(node, dict):
            if "submissions_due" in node:
                due = node["submissions_due"]
                end = due.get("end") if isinstance(due, dict) else None
                if type(end) is not int:
                    raise ValueError(f"{tasks_path}: submissions_due.end must be an integer")
                if due.get("relative_to", "reference_date") != "reference_date":
                    raise ValueError(f"{tasks_path}: submissions_due must be relative to reference_date")
                offsets.add(end)
            for value in node.values():
                visit(value)
        elif isinstance(node, list):
            for value in node:
                visit(value)

    visit(tasks)
    if len(offsets) != 1:
        raise ValueError(f"{tasks_path}: expected one consistent submissions_due.end offset, found {sorted(offsets)}")
    return offsets.pop()
