import { useDisclosure } from "@mantine/hooks";
import { Modal, Group, Button } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

const AboutHubOverlay = ({
  title,
  children,
  buttonLabel = "About the Hub",
  // Optional custom trigger: (open) => node. Defaults to a button.
  renderTrigger,
}) => {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Modal opened={opened} onClose={close} title={title} centered>
        {children}
      </Modal>

      {renderTrigger ? (
        renderTrigger(open)
      ) : (
        <Group justify="flex-start">
          <Button
            variant="subtle"
            size="xs"
            color="gray"
            onClick={open}
            leftSection={<IconInfoCircle size={16} />}
          >
            {/* Use the buttonLabel prop per view to name button */}
            {buttonLabel}
          </Button>
        </Group>
      )}
    </>
  );
};

export default AboutHubOverlay;
