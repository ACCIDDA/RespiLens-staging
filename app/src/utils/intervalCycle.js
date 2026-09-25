// The interval sets the "I" shortcut steps through: everything, the median
// with its 50% band, then the median alone. Keys a chart lacks are dropped,
// and sets that end up identical are merged.
const PRESETS = [["median", "ci50", "ci95"], ["median", "ci50"], ["median"]];

const visibleKeys = (visibility, keys) =>
  keys.filter((key) => visibility?.[key]);

// `keys`: the interval keys the chart offers. `presets` swaps in other sets
// for charts whose keys aren't median / ci50 / ci95. Any state that isn't
// one of the sets (say, only the 95% band) goes to the first, so I always
// lands somewhere predictable.
export const nextIntervalVisibility = (current, keys, presets = PRESETS) => {
  const sets = [];
  presets.forEach((preset) => {
    const set = preset.filter((key) => keys.includes(key));
    const seen = sets.some(
      (other) =>
        other.length === set.length && other.every((k) => set.includes(k)),
    );
    if (set.length && !seen) sets.push(set);
  });
  if (!sets.length) return current;

  const shown = visibleKeys(current, keys);
  const index = sets.findIndex(
    (set) => set.length === shown.length && set.every((k) => shown.includes(k)),
  );
  const next = sets[(index + 1) % sets.length];

  const visibility = {};
  keys.forEach((key) => {
    visibility[key] = next.includes(key);
  });
  return visibility;
};
