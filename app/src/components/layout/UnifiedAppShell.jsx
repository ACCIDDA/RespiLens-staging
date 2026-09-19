import { AppShell, Burger, Group, Overlay } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import SidebarNav, { BrandLink } from "./SidebarNav";

// Sidebar-only shell: all navigation (site sections, the forecast datasets
// and views, About) lives in the sidebar. Phones get a slim bar with a
// burger that opens the same sidebar as a drawer.
const UnifiedAppShell = ({ children }) => {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] =
    useDisclosure();
  // Mantine's "sm" breakpoint (48em): below it the sidebar becomes a drawer
  const isMobile = useMediaQuery("(max-width: 48em)");

  return (
    <AppShell
      header={{ height: 52, collapsed: !isMobile }}
      navbar={{
        width: 218,
        breakpoint: "sm",
        collapsed: { mobile: !mobileOpened, desktop: false },
      }}
      padding={0}
    >
      <AppShell.Header
        px="md"
        withBorder={false}
        className="respilens-shell-header"
      >
        <Group h="100%" gap="sm" wrap="nowrap">
          <Burger
            opened={mobileOpened}
            onClick={toggleMobile}
            size="sm"
            aria-label="Open navigation"
          />
          <BrandLink onNavigate={closeMobile} />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        px="sm"
        py="md"
        withBorder={false}
        className="respilens-shell-navbar"
        style={{ overflow: "auto", display: "flex", flexDirection: "column" }}
      >
        <SidebarNav onNavigate={closeMobile} />
      </AppShell.Navbar>

      {isMobile && mobileOpened && (
        // Tapping the page beside the narrow drawer closes it
        <Overlay
          fixed
          color="#0f172a"
          backgroundOpacity={0.3}
          zIndex={99}
          onClick={closeMobile}
        />
      )}

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
};

export default UnifiedAppShell;
