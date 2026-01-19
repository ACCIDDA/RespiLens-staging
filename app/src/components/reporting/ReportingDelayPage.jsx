import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  List,
  Paper,
  RangeSlider,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconArrowRight, IconClock, IconDownload, IconFileUpload } from '@tabler/icons-react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

const SAMPLE_CSV = `reference_date,report_date,value
2024-02-01,2024-02-02,31
2024-02-01,2024-02-03,56
2024-02-01,2024-02-04,71
2024-02-01,2024-02-05,79
2024-02-02,2024-02-03,28
2024-02-02,2024-02-04,52
2024-02-02,2024-02-05,68
2024-02-02,2024-02-06,74
2024-02-03,2024-02-04,26
2024-02-03,2024-02-05,45
2024-02-03,2024-02-06,62
2024-02-03,2024-02-07,70
2024-02-04,2024-02-05,24
2024-02-04,2024-02-06,39
2024-02-04,2024-02-07,55
2024-02-04,2024-02-08,63
2024-02-05,2024-02-06,23
2024-02-05,2024-02-07,35
2024-02-05,2024-02-08,49
2024-02-05,2024-02-09,58`;

const parseCsv = (text) => {
  const rows = text.trim().split(/\r?\n/).filter(Boolean);
  if (rows.length < 2) {
    throw new Error('CSV appears to be empty.');
  }

  const headers = rows[0].split(',').map((header) => header.trim());
  const normalizedHeaders = headers.map((header) => header.toLowerCase());
  const dataRows = rows.slice(1).map((row) => row.split(','));

  const records = dataRows.map((parts, index) => {
    const entry = {};
    headers.forEach((header, headerIndex) => {
      entry[header] = parts[headerIndex]?.trim() ?? '';
    });
    entry._rowIndex = index + 2;
    return entry;
  });

  return { headers, normalizedHeaders, records };
};

const formatDateLabel = (value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const buildTriangle = (records, { referenceDates, maxReportDate } = {}) => {
  const allReferenceDates = Array.from(new Set(records.map((record) => record.referenceDate))).sort();
  const allReportDates = Array.from(new Set(records.map((record) => record.reportDate))).sort();
  const activeReferenceDates = referenceDates?.length ? referenceDates : allReferenceDates;
  const activeReportDates = maxReportDate
    ? allReportDates.filter((date) => date <= maxReportDate)
    : allReportDates;
  const allowedReferenceDates = new Set(activeReferenceDates);
  const allowedReportDates = new Set(activeReportDates);
  const filteredRecords = records.filter(
    (record) => allowedReferenceDates.has(record.referenceDate) && allowedReportDates.has(record.reportDate),
  );
  const valueMap = new Map(filteredRecords.map((record) => [`${record.referenceDate}|${record.reportDate}`, record.value]));

  return { referenceDates: activeReferenceDates, reportDates: activeReportDates, valueMap, filteredRecords };
};

const buildDelayDistribution = (records) => {
  const delayMap = new Map();
  records.forEach((record) => {
    const delayDays = Math.max(
      0,
      Math.round((new Date(record.reportDate) - new Date(record.referenceDate)) / (1000 * 60 * 60 * 24)),
    );
    delayMap.set(delayDays, (delayMap.get(delayDays) || 0) + record.value);
  });

  const delays = Array.from(delayMap.keys()).sort((a, b) => a - b);
  const values = delays.map((delay) => delayMap.get(delay) || 0);
  return { delays, values };
};

const calculateQuantiles = (delays, values) => {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total === 0) {
    return { medianDelay: 0, delay95: 0, total: 0 };
  }

  let cumulative = 0;
  let medianDelay = delays[0];
  let delay95 = delays[0];

  delays.forEach((delay, index) => {
    cumulative += values[index];
    const proportion = cumulative / total;
    if (proportion >= 0.5 && medianDelay === delays[0]) {
      medianDelay = delay;
    }
    if (proportion >= 0.95 && delay95 === delays[0]) {
      delay95 = delay;
    }
  });

  return { medianDelay, delay95, total };
};

const buildRecordsFromMapping = (rows, mapping) => {
  const { referenceDate, reportDate, value } = mapping;
  if (!referenceDate || !reportDate || !value) {
    return [];
  }

  return rows.map((row) => {
    const referenceValue = row[referenceDate];
    const reportValue = row[reportDate];
    const numericValue = Number(row[value]);
    if (!referenceValue || !reportValue || Number.isNaN(numericValue)) {
      return null;
    }
    return {
      referenceDate: referenceValue,
      reportDate: reportValue,
      value: numericValue,
    };
  }).filter(Boolean);
};

const INITIAL_PARSED = parseCsv(SAMPLE_CSV);

const ReportingDelayPage = () => {
  const inputRef = useRef(null);
  const [csvRows, setCsvRows] = useState(() => INITIAL_PARSED.records);
  const [csvHeaders, setCsvHeaders] = useState(() => INITIAL_PARSED.headers);
  const [fileName, setFileName] = useState('sample-epinowcast.csv');
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [columnMapping, setColumnMapping] = useState({
    referenceDate: 'reference_date',
    reportDate: 'report_date',
    value: 'value',
  });
  const [columnFilters, setColumnFilters] = useState({});

  const headerOptions = useMemo(
    () => csvHeaders.map((header) => ({ value: header, label: header })),
    [csvHeaders],
  );

  const extraColumns = useMemo(() => {
    const mappedColumns = new Set(Object.values(columnMapping).filter(Boolean));
    return csvHeaders.filter((header) => !mappedColumns.has(header));
  }, [csvHeaders, columnMapping]);

  const extraColumnOptions = useMemo(() => {
    return extraColumns.map((column) => ({
      column,
      options: Array.from(new Set(csvRows.map((row) => row[column]).filter(Boolean))).sort().map((value) => ({
        value,
        label: value,
      })),
    }));
  }, [csvRows, extraColumns]);

  const filteredRows = useMemo(() => {
    return csvRows.filter((row) => {
      return Object.entries(columnFilters).every(([column, value]) => {
        if (!value) return true;
        return row[column] === value;
      });
    });
  }, [csvRows, columnFilters]);

  const records = useMemo(
    () => buildRecordsFromMapping(filteredRows, columnMapping),
    [filteredRows, columnMapping],
  );

  const mappingComplete = Boolean(
    columnMapping.referenceDate && columnMapping.reportDate && columnMapping.value,
  );

  const allReferenceDates = useMemo(
    () => Array.from(new Set(records.map((record) => record.referenceDate))).sort(),
    [records],
  );
  const allReportDates = useMemo(
    () => Array.from(new Set(records.map((record) => record.reportDate))).sort(),
    [records],
  );
  const [referenceRange, setReferenceRange] = useState([0, Math.max(0, allReferenceDates.length - 1)]);
  const [maxReportDate, setMaxReportDate] = useState(allReportDates.at(-1) ?? null);

  const activeReferenceDates = useMemo(() => {
    const [start, end] = referenceRange;
    return allReferenceDates.slice(start, end + 1);
  }, [allReferenceDates, referenceRange]);

  const triangle = useMemo(
    () =>
      buildTriangle(records, {
        referenceDates: activeReferenceDates,
        maxReportDate,
      }),
    [records, activeReferenceDates, maxReportDate],
  );
  const distribution = useMemo(
    () => buildDelayDistribution(triangle.filteredRecords),
    [triangle.filteredRecords],
  );
  const summary = useMemo(
    () => calculateQuantiles(distribution.delays, distribution.values),
    [distribution.delays, distribution.values],
  );

  const hasLongDelay = summary.delay95 >= 7;
  const hasShortDelay = summary.delay95 <= 3;

  const recommendation = hasLongDelay
    ? 'Nowcasting is recommended to account for substantial reporting delays.'
    : hasShortDelay
      ? 'Nowcasting may be optional; delays resolve quickly.'
      : 'Consider nowcasting when you need near-real-time situational awareness.';

  const handleFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      setCsvRows(parsed.records);
      setCsvHeaders(parsed.headers);
      setFileName(file.name);
      setError(null);
      const referenceIndex = parsed.normalizedHeaders.indexOf('reference_date');
      const reportIndex = parsed.normalizedHeaders.indexOf('report_date');
      const valueIndex = parsed.normalizedHeaders.indexOf('value');
      const nextMapping = {
        referenceDate: referenceIndex >= 0 ? parsed.headers[referenceIndex] : '',
        reportDate: reportIndex >= 0 ? parsed.headers[reportIndex] : '',
        value: valueIndex >= 0 ? parsed.headers[valueIndex] : '',
      };
      setColumnMapping(nextMapping);
      setColumnFilters({});
      const parsedReferenceDates = Array.from(new Set(buildRecordsFromMapping(parsed.records, nextMapping).map((record) => record.referenceDate))).sort();
      const parsedReportDates = Array.from(new Set(buildRecordsFromMapping(parsed.records, nextMapping).map((record) => record.reportDate))).sort();
      setReferenceRange([0, Math.max(0, parsedReferenceDates.length - 1)]);
      setMaxReportDate(parsedReportDates.at(-1) ?? null);
    } catch (err) {
      setError(err.message);
    }
  };

  const sampleDataUri = useMemo(() => {
    const encoded = encodeURIComponent(SAMPLE_CSV);
    return `data:text/csv;charset=utf-8,${encoded}`;
  }, []);

  useEffect(() => {
    const maxIndex = Math.max(0, allReferenceDates.length - 1);
    setReferenceRange((prev) => {
      const nextStart = Math.min(prev[0], maxIndex);
      const nextEnd = Math.min(prev[1], maxIndex);
      return [nextStart, nextEnd];
    });
    if (maxReportDate && !allReportDates.includes(maxReportDate)) {
      setMaxReportDate(allReportDates.at(-1) ?? null);
    }
  }, [allReferenceDates, allReportDates, maxReportDate]);

  const reportDateOptions = useMemo(
    () => allReportDates.map((date) => ({ value: date, label: formatDateLabel(date) })),
    [allReportDates],
  );

  const sliderMarks = useMemo(() => {
    if (allReferenceDates.length <= 1) {
      return [{ value: 0, label: allReferenceDates[0] ? formatDateLabel(allReferenceDates[0]) : '' }];
    }
    return [
      { value: 0, label: formatDateLabel(allReferenceDates[0]) },
      {
        value: allReferenceDates.length - 1,
        label: formatDateLabel(allReferenceDates[allReferenceDates.length - 1]),
      },
    ];
  }, [allReferenceDates]);

  const triangleHeader = [
    <Table.Th key="reference">Reference date</Table.Th>,
    ...triangle.reportDates.map((date) => (
      <Table.Th key={date} ta="center">
        {formatDateLabel(date)}
      </Table.Th>
    )),
  ];

  const triangleRows = triangle.referenceDates.map((referenceDate) => (
    <Table.Tr key={referenceDate}>
      <Table.Td fw={600}>{formatDateLabel(referenceDate)}</Table.Td>
      {triangle.reportDates.map((reportDate) => {
        const value = triangle.valueMap.get(`${referenceDate}|${reportDate}`);
        const intensity = value ? Math.min(1, value / 80) : 0;
        return (
          <Table.Td
            key={`${referenceDate}-${reportDate}`}
            ta="center"
            style={{
              backgroundColor: value ? `rgba(34, 139, 230, ${0.08 + intensity * 0.45})` : 'transparent',
              borderRadius: 6,
            }}
          >
            {value ?? '—'}
          </Table.Td>
        );
      })}
    </Table.Tr>
  ));

  const revisionChartData = useMemo(() => {
    const referenceSeries = triangle.referenceDates.slice(0, 3);
    const labels = triangle.reportDates.map(formatDateLabel);
    return {
      labels,
      datasets: referenceSeries.map((referenceDate, index) => ({
        label: formatDateLabel(referenceDate),
        data: triangle.reportDates.map((reportDate) => triangle.valueMap.get(`${referenceDate}|${reportDate}`) ?? null),
        borderColor: ['#1c7ed6', '#2f9e44', '#f59f00'][index % 3],
        backgroundColor: 'transparent',
        tension: 0.3,
      })),
    };
  }, [triangle.referenceDates, triangle.reportDates, triangle.valueMap]);

  const delayChartData = useMemo(() => {
    return {
      labels: distribution.delays.map((delay) => `${delay}d`),
      datasets: [
        {
          label: 'Total reports',
          data: distribution.values,
          backgroundColor: '#4dabf7',
        },
      ],
    };
  }, [distribution.delays, distribution.values]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Stack gap="xs">
          <Badge variant="light" leftSection={<IconClock size={14} />} w="fit-content">
            Reporting triangle explorer
          </Badge>
          <Title order={1}>Do I need to nowcast?</Title>
          <Text c="dimmed" size="lg">
            Drop an EpiNowcast-style CSV to build a reporting triangle, delay distribution, and a quick recommendation.
            Everything runs locally in your browser.
          </Text>
        </Stack>

        <Paper
          withBorder
          radius="md"
          p="lg"
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            handleFile(event.dataTransfer.files?.[0]);
          }}
          style={{
            borderStyle: 'dashed',
            borderColor: isDragging ? 'var(--mantine-color-blue-6)' : undefined,
            background: isDragging ? 'var(--mantine-color-blue-0)' : undefined,
          }}
        >
          <Stack align="center" gap="sm">
            <ThemeIcon size={52} radius="xl" variant="light">
              <IconFileUpload size={28} />
            </ThemeIcon>
            <Text fw={600}>Drag & drop a CSV file here</Text>
            <Text size="sm" c="dimmed" ta="center">
              Expected columns: <code>reference_date</code>, <code>report_date</code>, <code>value</code>.
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              Each row should be a cumulative total for one reference date as reported on a later report date.
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              Optional columns like location, age, or target are supported and can be filtered after upload.
            </Text>
            <Group gap="xs">
              <Anchor href="https://github.com/epinowcast/epinowcast" target="_blank" rel="noreferrer" size="sm">
                EpiNowcast sample datasets
              </Anchor>
              <Anchor href="https://baselinenowcast.epinowcast.org" target="_blank" rel="noreferrer" size="sm">
                Baseline nowcast demo data
              </Anchor>
            </Group>
            <Group>
              <Button onClick={() => inputRef.current?.click()}>Choose file</Button>
              <Button
                component="a"
                href={sampleDataUri}
                download="sample-epinowcast.csv"
                variant="subtle"
                leftSection={<IconDownload size={16} />}
              >
                Download sample
              </Button>
            </Group>
            <Text size="sm" c="dimmed">
              Current dataset: <strong>{fileName}</strong>
            </Text>
            {error && (
              <Text size="sm" c="red">
                {error} Showing the last valid dataset.
              </Text>
            )}
            {!mappingComplete && (
              <Text size="sm" c="orange">
                We couldn&apos;t automatically map the required columns. Please select them below.
              </Text>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </Stack>
        </Paper>

        <Card withBorder radius="md" padding="lg">
          <Stack gap="sm">
            <Group justify="space-between">
              <Title order={3}>Column mapping</Title>
              <Badge variant="outline">{csvHeaders.length} columns detected</Badge>
            </Group>
            <Text size="sm" c="dimmed">
              Map your CSV columns to the required fields. Defaults are auto-detected when possible.
            </Text>
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
              <Select
                label="Reference date"
                placeholder="Select column"
                data={headerOptions}
                value={columnMapping.referenceDate}
                onChange={(value) => setColumnMapping((prev) => ({ ...prev, referenceDate: value ?? '' }))}
                size="sm"
              />
              <Select
                label="Report date"
                placeholder="Select column"
                data={headerOptions}
                value={columnMapping.reportDate}
                onChange={(value) => setColumnMapping((prev) => ({ ...prev, reportDate: value ?? '' }))}
                size="sm"
              />
              <Select
                label="Value"
                placeholder="Select column"
                data={headerOptions}
                value={columnMapping.value}
                onChange={(value) => setColumnMapping((prev) => ({ ...prev, value: value ?? '' }))}
                size="sm"
              />
            </SimpleGrid>
          </Stack>
        </Card>

        {extraColumnOptions.length > 0 && (
          <Card withBorder radius="md" padding="lg">
            <Stack gap="sm">
              <Group justify="space-between">
                <Title order={3}>Filter optional columns</Title>
                <Badge variant="outline">Filters update the triangle</Badge>
              </Group>
              <Text size="sm" c="dimmed">
                Narrow by location, age, target, or other metadata. Clear a filter to include all values.
              </Text>
              <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                {extraColumnOptions.map(({ column, options }) => (
                  <Select
                    key={column}
                    label={column}
                    placeholder="All values"
                    data={options}
                    value={columnFilters[column] ?? null}
                    onChange={(value) => setColumnFilters((prev) => ({ ...prev, [column]: value }))}
                    clearable
                    searchable
                    size="sm"
                  />
                ))}
              </SimpleGrid>
            </Stack>
          </Card>
        )}

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
          <Card withBorder radius="md" padding="lg">
            <Stack gap="sm">
              <Group justify="space-between">
                <Title order={3}>Reporting triangle</Title>
                <Badge variant="outline">{triangle.referenceDates.length} reference dates</Badge>
              </Group>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  Use the slider to focus on a subset of reference dates, and set a report-date cutoff for longer
                  series.
                </Text>
                <RangeSlider
                  value={referenceRange}
                  onChange={setReferenceRange}
                  min={0}
                  max={Math.max(0, allReferenceDates.length - 1)}
                  step={1}
                  marks={sliderMarks}
                  label={(value) => formatDateLabel(allReferenceDates[value])}
                />
                <Select
                  label="Report-date cutoff"
                  data={reportDateOptions}
                  value={maxReportDate}
                  onChange={setMaxReportDate}
                  allowDeselect={false}
                  size="sm"
                />
              </Stack>
              <Text size="sm" c="dimmed">
                Each row is a reference date, each column is a report date. Darker cells are larger cumulative counts.
              </Text>
              <ScrollArea>
                <Table withTableBorder striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>{triangleHeader}</Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>{triangleRows}</Table.Tbody>
                </Table>
              </ScrollArea>
            </Stack>
          </Card>

          <Card withBorder radius="md" padding="lg">
            <Stack gap="sm">
              <Group justify="space-between">
                <Title order={3}>Revision trajectories</Title>
                <Badge variant="outline">first 3 reference dates</Badge>
              </Group>
              <Text size="sm" c="dimmed">
                View how reported totals evolve over successive reports.
              </Text>
              <Chart type="line" data={revisionChartData} options={chartOptions} />
            </Stack>
          </Card>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
          <Card withBorder radius="md" padding="lg">
            <Stack gap="sm">
              <Group justify="space-between">
                <Title order={3}>Delay distribution</Title>
                <Badge variant="outline">{summary.total} total reports</Badge>
              </Group>
              <Text size="sm" c="dimmed">
                How long it takes for reports to arrive after the reference date.
              </Text>
              <Chart type="bar" data={delayChartData} options={chartOptions} />
            </Stack>
          </Card>

          <Card withBorder radius="md" padding="lg">
            <Stack gap="md">
              <Title order={3}>Summary</Title>
              <Paper withBorder radius="md" p="md">
                <Stack gap={4}>
                  <Text fw={600}>Based on this dataset:</Text>
                  <Text>
                    The reported quantity is <strong>95% complete after {summary.delay95} days</strong>, with a
                    <strong> median delay of {summary.medianDelay} days</strong>.
                  </Text>
                  <Text c="dimmed" size="sm">
                    {recommendation}
                  </Text>
                </Stack>
              </Paper>

              <Divider />

              <Stack gap="xs">
                <Text fw={600}>Decision tree</Text>
                <List spacing="xs" size="sm" icon={<ThemeIcon size={20} radius="xl" variant="light"><IconArrowRight size={14} /></ThemeIcon>}>
                  <List.Item>Long delays (≥7 days): prioritize nowcasting and backfill-aware evaluation.</List.Item>
                  <List.Item>Moderate delays (4–6 days): nowcasting for rapid reporting, forecasts for planning.</List.Item>
                  <List.Item>Short delays (≤3 days): focus on forecasts, optional nowcast for same-week metrics.</List.Item>
                </List>
              </Stack>
            </Stack>
          </Card>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
          <Card withBorder radius="md" padding="lg">
            <Stack gap="sm">
              <Title order={3}>Caveats from reporting triangles</Title>
              <List spacing="xs" size="sm">
                <List.Item>Late reports can be structurally different (e.g., lab corrections, backfills).</List.Item>
                <List.Item>Holiday effects and reporting interruptions bias delay estimates.</List.Item>
                <List.Item>Negative revisions need separate handling before computing cumulative totals.</List.Item>
                <List.Item>Changes in case definitions or data pipelines break comparability over time.</List.Item>
              </List>
            </Stack>
          </Card>

          <Card withBorder radius="md" padding="lg">
            <Stack gap="sm">
              <Title order={3}>Useful links</Title>
              <List spacing="xs" size="sm">
                <List.Item>
                  <Anchor href="https://baselinenowcast.epinowcast.org" target="_blank" rel="noreferrer">
                    Baseline nowcast toolkit
                  </Anchor>
                </List.Item>
                <List.Item>
                  <Anchor href="https://epinowcast.org" target="_blank" rel="noreferrer">
                    EpiNowcast documentation
                  </Anchor>
                </List.Item>
              </List>
              <Box>
                <Text size="sm" c="dimmed">
                  Want help operationalizing? Start with the baseline nowcast decision tree and upgrade to EpiNowcast
                  when you need probabilistic delay distributions.
                </Text>
              </Box>
            </Stack>
          </Card>
        </SimpleGrid>
      </Stack>
    </Container>
  );
};

export default ReportingDelayPage;
