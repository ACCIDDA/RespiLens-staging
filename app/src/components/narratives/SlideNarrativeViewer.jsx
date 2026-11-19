import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ActionIcon,
  Anchor,
  Box,
  Button,
  Grid,
  Stack,
  Text,
  Title,
  Tooltip,
  VisuallyHidden,
} from "@mantine/core";
import {
  IconChevronLeft,
  IconChevronRight,
  IconMaximize,
  IconMinimize,
} from "@tabler/icons-react";
import { useMediaQuery } from "@mantine/hooks";
import { getNarrative } from "../../data/narratives/index.js";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import { DATASETS } from "../../config/datasets";
import { ChartStoryContext } from "../../contexts/ChartStoryContext";
import { validHighlights } from "../../utils/chartHighlights";
import { getPeakModels } from "../../utils/peakForecasts";
import { getTrajectoryModels } from "../../utils/trajectoryForecasts";
import DataVisualizationContainer from "../DataVisualizationContainer";
import NotFoundPage from "../NotFoundPage";
import ShortcutHint from "../ShortcutHint";
import Seo from "../Seo";
import StoryProse from "./StoryProse";
import ChartHighlights from "./ChartHighlights";
import CustomChart from "./visuals/CustomChart";
import HubLinks from "./visuals/HubLinks";
import HubTable from "./visuals/HubTable";
import StateMap from "./visuals/StateMap";
import StoryCover from "./StoryCover";
import NarrativeViewProvider from "./NarrativeViewProvider";
import { useIntroStory } from "./useIntroStory";

// The state a narrative's slides share, by the name its `story` field gives
const STORIES = {
  intro: useIntroStory,
};

// What a slide draws beside its prose, by its `visual` field, given the
// story and the slide. "forecast" is the app's own chart (header and
// keyboard shortcuts included, reading the story through useView, see
// NarrativeViewProvider); "chart" a chart the slide draws itself from a
// blank canvas (its `chart` function, see CustomChart).
//
// Either kind of chart takes the slide's `highlights` (points called out
// on it, see utils/chartHighlights; an array, or a function of the story)
// and, for the app's charts, `customize`: { traces, layout } functions
// changing what the chart draws, given { story, colorScheme, scale }.
const VISUALS = {
  "state-map": StateMap,
  forecast: () => <DataVisualizationContainer embedded />,
  chart: CustomChart,
  "hub-links": HubLinks,
  "hub-table": HubTable,
};

// The data a slide's `view.hub` reads ("peak" draws FluSight's data too)
const dataHub = (slide) =>
  slide?.view?.hub === "peak" ? "flu" : slide?.view?.hub || null;

// MetroCast's ensemble for each forecast span
const METRO_SPAN_MODELS = {
  "4wk": DATASETS.metrocast.defaultModel,
  season: DATASETS.metrocast.longTermDefaultModel,
};

const REQUIREMENT_HINTS = {
  location: "Choose a location to continue.",
  pastDate: "No earlier season to look back on for this location.",
};

// A slide's starting chart setup, from its `view`
const defaultViewState = (view = {}) => ({
  // null: every model forecasting on the shown dates; undefined: the
  // hub's ensemble
  models: view.models === "all" ? null : undefined,
  // undefined: the slide's target, else the hub's
  target: undefined,
  // undefined: the story's date for the slide alone
  dates: undefined,
  span: view.span || "4wk",
  chartScale: "linear",
  intervalVisibility: view.intervals || {
    median: true,
    ci50: true,
    ci95: true,
  },
  showLegend: true,
  showOtherGroundTruthSeasons: false,
  showHistogram: false,
});

// `view.spread` ({ days, count }): `count` forecast dates spread evenly
// over the `days` before `end`, ending on it, so the app's chart shows how
// forecasts went over time (it draws up to 20 dates at once)
const spreadDates = (available, { days, count }, end) => {
  const from = new Date(Date.parse(`${end}T00:00:00Z`) - days * 86400000)
    .toISOString()
    .slice(0, 10);
  const pool = available.filter((date) => date > from && date <= end);
  if (pool.length <= count) return pool;
  return [
    ...new Set(
      Array.from(
        { length: count },
        (_, index) =>
          pool[Math.round((index * (pool.length - 1)) / (count - 1))],
      ),
    ),
  ];
};

const NO_SNAPSHOTS = {};

const unmetRequirement = (slide, story) =>
  (slide?.requires || []).find((key) => !story[key]) || null;

// The bar pinned to the bottom of the page: Previous, the numbered steps
// (on wide screens; "Step 3 of 12" on phones) and Next. A step the reader
// cannot open yet (it needs a choice made first) is disabled, with the
// reason shown and read out.
const StepNavigation = ({
  slides,
  index,
  story,
  goTo,
  hintId,
  compact,
  fullscreen,
  onToggleFullscreen,
}) => {
  const next = slides[index + 1];
  const blocked = next ? unmetRequirement(next, story) : null;
  const previousLabel = <ShortcutHint label="Previous step" shortcut="←" />;
  const nextLabel = <ShortcutHint label="Next step" shortcut="→" />;

  return (
    <div className="respilens-story-bar-dock">
      <div className="respilens-story-bar">
        <Tooltip label={previousLabel} openDelay={300}>
          {compact ? (
            <ActionIcon
              variant="default"
              size="lg"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              aria-label="Previous step"
              aria-keyshortcuts="ArrowLeft P"
            >
              <IconChevronLeft size={18} />
            </ActionIcon>
          ) : (
            <Button
              variant="default"
              leftSection={<IconChevronLeft size={16} />}
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              aria-keyshortcuts="ArrowLeft P"
            >
              Previous
            </Button>
          )}
        </Tooltip>

        <Stack gap={2} align="center" style={{ flex: 1, minWidth: 0 }}>
          {compact ? (
            <Text size="sm" fw={600}>
              Step {index + 1} of {slides.length}
            </Text>
          ) : (
            <nav aria-label="Story steps">
              <ol className="respilens-story-steps">
                {slides.map((slide, slideIndex) => {
                  const label = [slide.chapter, slide.short || slide.title]
                    .filter(Boolean)
                    .join(" › ");
                  return (
                    <li
                      key={slide.id}
                      // A little more room where a new chapter starts
                      data-chapter-start={
                        slideIndex > 0 &&
                        slide.chapter !== slides[slideIndex - 1].chapter
                          ? true
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        className="respilens-story-step"
                        aria-current={slideIndex === index ? "step" : undefined}
                        aria-label={`Step ${slideIndex + 1}: ${label}`}
                        title={label}
                        disabled={Boolean(unmetRequirement(slide, story))}
                        onClick={() => goTo(slideIndex)}
                      >
                        {slideIndex + 1}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}
          {blocked && (
            <Text size="xs" c="dimmed" id={hintId}>
              {REQUIREMENT_HINTS[blocked]}
            </Text>
          )}
        </Stack>

        <Tooltip label={nextLabel} openDelay={300}>
          {compact ? (
            <ActionIcon
              variant="filled"
              size="lg"
              onClick={() => goTo(index + 1)}
              disabled={!next || Boolean(blocked)}
              aria-label="Next step"
              aria-describedby={blocked ? hintId : undefined}
              aria-keyshortcuts="ArrowRight N"
            >
              <IconChevronRight size={18} />
            </ActionIcon>
          ) : (
            <Button
              rightSection={<IconChevronRight size={16} />}
              onClick={() => goTo(index + 1)}
              disabled={!next || Boolean(blocked)}
              aria-describedby={blocked ? hintId : undefined}
              aria-keyshortcuts="ArrowRight N"
            >
              Next
            </Button>
          )}
        </Tooltip>
        <Tooltip
          label={
            <ShortcutHint
              label={fullscreen ? "Exit full screen" : "Full screen"}
              shortcut="f"
            />
          }
          openDelay={300}
        >
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            onClick={onToggleFullscreen}
            aria-label={fullscreen ? "Exit full screen" : "Full screen"}
            aria-pressed={fullscreen}
            aria-keyshortcuts="F"
          >
            {fullscreen ? (
              <IconMinimize size={18} />
            ) : (
              <IconMaximize size={18} />
            )}
          </ActionIcon>
        </Tooltip>
      </div>
    </div>
  );
};

const NarrativeStory = ({ narrative, useStory }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const headingRef = useRef(null);
  const focusOnStepRef = useRef(false);
  const [announcement, setAnnouncement] = useState("");
  const headingId = useId();
  const hintId = useId();
  // Phones get a compact bar: arrows and "Step 3 of 12"
  const compactNav = useMediaQuery("(max-width: 48em)");

  // Merge a patch into the URL (null removes a key). Choices replace the
  // history entry; only moving between steps adds one.
  const updateParams = useCallback(
    (patch, { push = false } = {}) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          Object.entries(patch).forEach(([key, value]) => {
            if (value === null || value === undefined) next.delete(key);
            else next.set(key, value);
          });
          return next;
        },
        { replace: !push },
      );
    },
    [setSearchParams],
  );

  const { slides } = narrative;
  const requested = Math.min(
    Math.max(Number(searchParams.get("step")) || 1, 1),
    slides.length,
  );
  // Load the data of the step asked for and of its neighbours, so the
  // next step opens ready
  const activeHubs = useMemo(
    () =>
      new Set(
        slides
          .slice(Math.max(requested - 2, 0), requested + 1)
          .map(dataHub)
          .filter(Boolean),
      ),
    [slides, requested],
  );
  // A narrative with `asOf` reads its data as of that date, so it tells the
  // same story whenever it is opened
  const asOf = narrative.asOf || new Date().toISOString().slice(0, 10);
  // Data a narrative keeps beside its slides (`snapshots`: { name: url },
  // fixed files made once for it), loaded once and read as story.snapshots
  const { data: snapshots } = useAsyncData(
    narrative.snapshots
      ? () =>
          Promise.all(
            Object.entries(narrative.snapshots).map(([name, url]) =>
              fetch(url)
                .then((response) => response.json())
                .then((json) => [name, json]),
            ),
          ).then(Object.fromEntries)
      : null,
    [narrative],
  );
  const storyState = useStory({
    params: searchParams,
    updateParams,
    activeHubs,
    asOf,
  });
  const story = useMemo(
    () => ({ ...storyState, snapshots: snapshots || NO_SNAPSHOTS }),
    [storyState, snapshots],
  );
  // A shared link to a step whose choice is missing opens at the start
  // (once its data has loaded and the choice is known to be missing)
  const index =
    unmetRequirement(slides[requested - 1], story) &&
    !(story.location && story.loading)
      ? 0
      : requested - 1;
  const slide = slides[index];

  // `patch`: choices made on the way (a location picked on the map), set
  // in the same step so the next slide opens with them
  const goTo = useCallback(
    (target, patch = null) => {
      if (target < 0 || target >= slides.length || target === index) return;
      if (!patch && unmetRequirement(slides[target], story)) return;
      focusOnStepRef.current = true;
      updateParams(
        { ...patch, step: target === 0 ? null : String(target + 1) },
        { push: true },
      );
    },
    [slides, index, story, updateParams],
  );
  // On a slide with `advanceOnLocation`, choosing a place moves on
  const chooseLocation = useCallback(
    (location) => goTo(index + 1, story.locationPatch(location)),
    [goTo, index, story],
  );

  // Full screen: the app's sidebar and header step aside at once, and the
  // browser goes full screen where it can (menus and tooltips, drawn at the
  // page's root, still show). Leaving the browser's full screen (Esc) leaves
  // it all; where there is none (iPhone), only the sidebar hides.
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const sync = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      if (document.fullscreenElement) document.exitFullscreen?.();
    };
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    if (fullscreen) root.setAttribute("data-story-fullscreen", "");
    else root.removeAttribute("data-story-fullscreen");
    return () => root.removeAttribute("data-story-fullscreen");
  }, [fullscreen]);
  const toggleFullscreen = useCallback(() => {
    if (fullscreen) {
      setFullscreen(false);
      if (document.fullscreenElement) document.exitFullscreen?.();
      return;
    }
    setFullscreen(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, [fullscreen]);
  useKeyboardShortcut("f", toggleFullscreen);

  // After a step change, move focus to the new slide's heading and announce
  // it, so keyboard and screen reader users land at the start of the slide.
  // Deferred past the chart's date selector, which focuses itself 100 ms
  // after it mounts.
  useEffect(() => {
    if (!focusOnStepRef.current) return undefined;
    focusOnStepRef.current = false;
    setAnnouncement(`Step ${index + 1} of ${slides.length}: ${slide.title}`);
    const timer = setTimeout(() => {
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({ block: "nearest" });
    }, 150);
    return () => clearTimeout(timer);
  }, [index, slide, slides.length]);

  // ← / → (or N / P) move between slides; the chart's date changes with
  // its own buttons
  useKeyboardShortcut("n", () => goTo(index + 1));
  useKeyboardShortcut("p", () => goTo(index - 1));
  useKeyboardShortcut("ArrowRight", () => goTo(index + 1));
  useKeyboardShortcut("ArrowLeft", () => goTo(index - 1));

  // Each slide keeps its own chart setup (models, scale, intervals...)
  // while the reader moves back and forth
  const [viewStates, setViewStates] = useState({});
  const storedView = viewStates[slide.id] || defaultViewState(slide.view);
  const hub = story.hubs[slide.view?.hub || "flu"];
  const viewType = hub.viewType;
  const isPeak = viewType === "flu_peak";
  const dateEntry = story.dates?.[slide.view?.date];
  const shownDate = dateEntry?.value || null;
  // The dates the reader added on this slide (or the slide's spread of
  // dates), while they include the story's date (another slide may have
  // moved it since)
  const spread = slide.view?.spread;
  const dates = useMemo(() => {
    if (!shownDate) return [];
    const available = dateEntry?.available || [];
    const chosen =
      storedView.dates ||
      (spread ? spreadDates(available, spread, shownDate) : []);
    const kept = chosen.filter((date) => available.includes(date));
    return kept.includes(shownDate) ? kept : [shownDate];
  }, [storedView.dates, spread, dateEntry, shownDate]);
  const slideTarget = slide.view?.target;
  const { target: hubTarget, forecasts, ensembleModel } = hub;
  const { peaks, ensembleModel: peakEnsembleModel } = story.peak;
  const viewState = useMemo(() => {
    const target = storedView.target || slideTarget || hubTarget;
    let models = storedView.models;
    if (models === null) {
      models = isPeak
        ? getPeakModels(peaks, shownDate)
        : getTrajectoryModels(forecasts, dates, target);
    }
    if (models === undefined) {
      models = [
        viewType === "metrocast_forecasts"
          ? METRO_SPAN_MODELS[storedView.span]
          : isPeak
            ? peakEnsembleModel
            : ensembleModel,
      ];
    }
    return { ...storedView, target, models };
  }, [
    storedView,
    slideTarget,
    hubTarget,
    forecasts,
    ensembleModel,
    viewType,
    isPeak,
    peaks,
    peakEnsembleModel,
    shownDate,
    dates,
  ]);
  const onViewChange = useCallback(
    (patch) =>
      setViewStates((previous) => ({
        ...previous,
        [slide.id]: {
          ...(previous[slide.id] || defaultViewState(slide.view)),
          ...patch,
        },
      })),
    [slide],
  );
  // The story keeps the date the reader is on (the prose describes it);
  // the slide keeps any dates added beside it
  const onDatesChange = useCallback(
    (next) => {
      const sorted = [...next].sort();
      if (!sorted.length) return;
      onViewChange({ dates: sorted });
      if (!sorted.includes(shownDate)) dateEntry?.set(sorted.at(-1));
    },
    [onViewChange, shownDate, dateEntry],
  );
  const onActiveDateChange = useCallback(
    (date) => date && dateEntry?.set(date),
    [dateEntry],
  );
  const extras = useMemo(
    () => ({
      showObservedPeak: Boolean(slide.view?.showObservedPeak),
      // Focus goes to the slide's heading, not the chart's date, and ← / →
      // move between slides
      autoFocusDate: false,
      dateArrowKeys: false,
      // MetroCast's small city charts would squeeze the state's: the place
      // is picked in the chart's title instead
      showMetroTiles: false,
    }),
    [slide],
  );

  // The slide's highlights, kept stable while they stay the same
  const highlightKey = JSON.stringify(
    validHighlights(
      typeof slide.highlights === "function"
        ? slide.highlights(story)
        : slide.highlights,
    ),
  );
  const highlights = useMemo(() => JSON.parse(highlightKey), [highlightKey]);
  // A customization reads the story, so it follows it; highlights alone
  // leave the chart alone between changes
  const { customize } = slide;
  const customizeStory = customize ? story : null;
  const chartStory = useMemo(
    () => ({ highlights, customize, story: customizeStory }),
    [highlights, customize, customizeStory],
  );

  const body =
    typeof slide.body === "function" ? slide.body(story) : slide.body;
  const Visual = VISUALS[slide.visual];
  const navigation = (
    <StepNavigation
      slides={slides}
      index={index}
      story={story}
      goTo={goTo}
      hintId={hintId}
      compact={compactNav}
      fullscreen={fullscreen}
      onToggleFullscreen={toggleFullscreen}
    />
  );
  const isCover = slide.layout === "cover";

  return (
    <>
      <Seo
        title={`RespiLens | ${narrative.title}`}
        description={narrative.abstract}
        canonicalPath={`/narratives/${narrative.id}`}
        type="article"
      />
      <VisuallyHidden role="status" aria-live="polite">
        {announcement}
      </VisuallyHidden>
      {/* Room at the bottom for the step bar pinned over the page */}
      <Box px={{ base: "sm", sm: "md" }} pt="sm" pb={96} maw={1600} mx="auto">
        <Stack gap="lg">
          {/* The cover shows the title as the page's heading */}
          {!isCover && (
            <VisuallyHidden>
              <Title order={1}>{narrative.title}</Title>
            </VisuallyHidden>
          )}
          {/* Narratives › Introduction to US forecasting › FluSight › Peak */}
          <nav aria-label="Breadcrumb">
            <ol className="respilens-story-breadcrumb">
              <li>
                <Anchor component={Link} to="/narratives" inherit c="dimmed">
                  Narratives
                </Anchor>
              </li>
              <li aria-current={isCover ? "page" : undefined}>
                {isCover ? (
                  <Text span inherit fw={600}>
                    {narrative.shortTitle || narrative.title}
                  </Text>
                ) : (
                  <Anchor
                    component={Link}
                    // Back to the cover, keeping the reader's choices
                    to={`/narratives/${narrative.id}?${new URLSearchParams(
                      [...searchParams].filter(([key]) => key !== "step"),
                    )}`}
                    inherit
                    c="dimmed"
                  >
                    {narrative.shortTitle || narrative.title}
                  </Anchor>
                )}
              </li>
              {slide.chapter && (
                <li>
                  <Text span inherit c="dimmed">
                    {slide.chapter}
                  </Text>
                </li>
              )}
              {!isCover && (
                <li aria-current="page">
                  <Text span inherit fw={600}>
                    {slide.short || slide.title}
                  </Text>
                </li>
              )}
            </ol>
          </nav>

          {isCover ? (
            <StoryCover
              narrative={narrative}
              headingId={headingId}
              ref={headingRef}
            />
          ) : (
            <Grid gutter={{ base: "lg", md: 48 }}>
              <Grid.Col span={{ base: 12, md: 5, lg: 4 }}>
                <Stack
                  component="section"
                  aria-labelledby={headingId}
                  gap="md"
                  maw={560}
                >
                  <Title
                    order={2}
                    id={headingId}
                    ref={headingRef}
                    tabIndex={-1}
                    fz={{ base: 24, sm: 28 }}
                    lh={1.25}
                    style={{ outline: "none", textWrap: "balance" }}
                  >
                    {slide.title}
                  </Title>
                  <StoryProse>{body}</StoryProse>
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 7, lg: 8 }}>
                <NarrativeViewProvider
                  viewType={viewType}
                  forecast={hub.forecast}
                  location={hub.location}
                  onLocationChange={
                    slide.advanceOnLocation ? chooseLocation : hub.setLocation
                  }
                  dates={dates}
                  onDatesChange={onDatesChange}
                  activeDate={shownDate}
                  onActiveDateChange={onActiveDateChange}
                  availableDates={dateEntry?.available}
                  view={viewState}
                  onViewChange={onViewChange}
                  spanModels={
                    viewType === "metrocast_forecasts"
                      ? METRO_SPAN_MODELS
                      : undefined
                  }
                  extras={extras}
                >
                  {/* A new chart for another view or season's date: it opens
                    on its own window instead of keeping the last one's zoom */}
                  <ChartStoryContext.Provider value={chartStory}>
                    <Stack gap="md">
                      {Visual && (
                        <Visual
                          key={`${slide.visual}-${viewType}-${slide.view?.date}`}
                          story={story}
                          slide={slide}
                        />
                      )}
                      <ChartHighlights highlights={highlights} />
                    </Stack>
                  </ChartStoryContext.Provider>
                </NarrativeViewProvider>
              </Grid.Col>
            </Grid>
          )}
        </Stack>
      </Box>
      {navigation}
    </>
  );
};

const SlideNarrativeViewer = () => {
  const { id } = useParams();
  const narrative = getNarrative(id);
  const useStory = narrative && STORIES[narrative.story];

  if (!narrative || !useStory) {
    return (
      <NotFoundPage
        title="Narrative not found"
        detail="There is no narrative at this address. It may have been renamed."
      />
    );
  }
  // Keyed by narrative: each story keeps its own hooks and state
  return (
    <NarrativeStory
      key={narrative.id}
      narrative={narrative}
      useStory={useStory}
    />
  );
};

export default SlideNarrativeViewer;
