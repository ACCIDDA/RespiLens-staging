export const validateForecastEntry = (entry) => {
  const issues = [];
  if (!entry) {
    return ['Missing forecast entry'];
  }
  const { interval50, interval95 } = entry;
  const lower50 = Number(interval50.lower);
  const upper50 = Number(interval50.upper);
  const lower95 = Number(interval95.lower);
  const upper95 = Number(interval95.upper);

  const ensureFinite = (value, label) => {
    if (!Number.isFinite(value)) {
      issues.push(`${label} must be a finite number`);
      return false;
    }
    if (value < 0) {
      issues.push(`${label} must be non-negative`);
      return false;
    }
    return true;
  };

  const is50Valid = ensureFinite(lower50, '50% lower') && ensureFinite(upper50, '50% upper');
  const is95Valid = ensureFinite(lower95, '95% lower') && ensureFinite(upper95, '95% upper');

  if (is50Valid && lower50 > upper50) {
    issues.push('50% upper bound must be at least as large as the lower bound');
  }
  if (is95Valid && lower95 > upper95) {
    issues.push('95% upper bound must be at least as large as the lower bound');
  }
  if (is50Valid && is95Valid) {
    if (lower95 > lower50) {
      issues.push('95% lower bound must be less than or equal to the 50% lower bound');
    }
    if (upper95 < upper50) {
      issues.push('95% upper bound must be greater than or equal to the 50% upper bound');
    }
  }

  return issues;
};

export const validateForecastSubmission = (entries) => {
  const errors = {};
  let hasError = false;

  entries.forEach((entry) => {
    const entryIssues = validateForecastEntry(entry);
    if (entryIssues.length > 0) {
      hasError = true;
      errors[entry.horizon] = entryIssues;
    }
  });

  return {
    valid: !hasError,
    errors,
  };
};
