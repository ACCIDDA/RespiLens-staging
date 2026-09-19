import { useLocation, Link } from "react-router-dom";
import {
  Anchor,
  Box,
  Divider,
  Group,
  Image,
  Stack,
  Title,
  UnstyledButton,
} from "@mantine/core";
import {
  IconLayoutDashboard,
  IconTarget,
  IconTool,
  IconChartScatter,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useView } from "../../hooks/useView";
import { APP_CONFIG } from "../../config/app";
import ViewSelector from "../ViewSelector";
import InfoOverlay from "../InfoOverlay";

const isForecastPath = (pathname) =>
  pathname === "/" ||
  pathname.startsWith("/forecasts") ||
  pathname.startsWith("/surveillance");

// Logo + wordmark; clicking it returns to the forecasts front page
export const BrandLink = ({ onNavigate }) => {
  const { setViewAndLocation } = useView();
  return (
    <Anchor
      component={Link}
      to="/"
      underline="never"
      c="inherit"
      onClick={() => {
        setViewAndLocation("frontpage", APP_CONFIG.defaultLocation);
        onNavigate?.();
      }}
    >
      <Group gap={8} align="center" wrap="nowrap">
        <Image
          src="/respilens-logo.svg"
          alt="RespiLens Logo"
          h={26}
          w="auto"
          fit="contain"
        />
        <Title order={4} c="blue">
          RespiLens
        </Title>
      </Group>
    </Anchor>
  );
};

// One sidebar row, styled like the dataset rows in ViewSelector: the current
// section gets a soft tint and a blue accent bar.
const NavRow = ({ icon: Icon, label, active, ...props }) => (
  <UnstyledButton
    className="respilens-nav-row"
    data-active={active || undefined}
    {...props}
  >
    <Icon size={17} stroke={1.75} />
    <span>{label}</span>
  </UnstyledButton>
);

// Everything navigational in one column: the overview, the forecasts and
// surveillance-data groups (always open), a separator, the other tools, and
// About pinned to the bottom. Replaces the top bar on desktop.
const SidebarNav = ({ onNavigate }) => {
  const location = useLocation();
  const { viewType, setViewAndLocation } = useView();
  const path = location.pathname;
  const onForecasts = isForecastPath(path);
  const onOverview = onForecasts && viewType === "frontpage";

  const tools = [
    {
      href: "/forecastle",
      label: "Forecastle",
      icon: IconTarget,
      active: path.startsWith("/forecastle"),
    },
    {
      href: "/toolbox",
      label: "Toolbox",
      icon: IconTool,
      active:
        path.startsWith("/toolbox") ||
        path.startsWith("/myrespilens") ||
        path.startsWith("/documentation"),
    },
    {
      href: "/myplots",
      label: "My Plots",
      icon: IconChartScatter,
      active: path.startsWith("/myplots"),
    },
  ];

  return (
    <Stack gap="md" h="100%">
      <Box px={10} pt={2} visibleFrom="sm">
        <BrandLink onNavigate={onNavigate} />
      </Box>

      <NavRow
        component={Link}
        to="/"
        icon={IconLayoutDashboard}
        label="Overview"
        active={onOverview}
        onClick={() => {
          setViewAndLocation("frontpage", APP_CONFIG.defaultLocation);
          onNavigate?.();
        }}
      />

      <ViewSelector showActive={onForecasts && !onOverview} />

      <Divider color="var(--respilens-hairline)" />

      <Stack gap={2}>
        {tools.map((tool) => (
          <NavRow
            key={tool.href}
            component={Link}
            to={tool.href}
            icon={tool.icon}
            label={tool.label}
            active={tool.active}
            onClick={onNavigate}
          />
        ))}
      </Stack>

      <Box mt="auto">
        <InfoOverlay
          renderTrigger={(open) => (
            <NavRow
              icon={IconInfoCircle}
              label="About RespiLens"
              data-tone="brand"
              onClick={open}
            />
          )}
        />
      </Box>
    </Stack>
  );
};

export default SidebarNav;
