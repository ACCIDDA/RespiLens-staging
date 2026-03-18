import { useDisclosure } from "@mantine/hooks";
import { Modal, Group, Button } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

const AboutHubOverlay = ({
  title,
  children,
  buttonLabel = "About the Hub",
}) => {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Modal opened={opened} onClose={close} title={title} centered>
        {children}
      </Modal>

      <Group justify="flex-start">
        <Button
          variant="light"
          size="xs"
          color="red"
          onClick={open}
          leftSection={<IconInfoCircle size={16} />}
        >
          {/* Use the buttonLabel prop per view to name button */}
          {buttonLabel}
        </Button>
      </Group>
    </>
  );
};

export default AboutHubOverlay;
