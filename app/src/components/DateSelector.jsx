import { useEffect, useCallback, useRef, useState } from "react";
import { Group, Text, ActionIcon, Button, Box } from "@mantine/core";
import {
  IconChevronLeft,
  IconChevronRight,
  IconX,
  IconPlus,
} from "@tabler/icons-react";

const DateSelector = ({
  availableDates,
  selectedDates,
  setSelectedDates,
  activeDate,
  setActiveDate,
  multi = true,
}) => {
  const [keyMovementAnchor, setKeyMovementAnchor] = useState(activeDate); // keyMovement responsible for date keydown movement
  const firstDateBoxRef = useRef(null);

  useEffect(() => {
    if (activeDate) {
      setKeyMovementAnchor(activeDate);
    }
  }, [activeDate]);
  const hasDate = !!activeDate;
  useEffect(() => {
    if (hasDate && firstDateBoxRef.current) {
      const timeout = setTimeout(() => firstDateBoxRef.current?.focus(), 100);
      return () => clearTimeout(timeout);
    }
  }, [hasDate]);
  const handleMove = useCallback(
    (dateToMove, direction) => {
      if (!dateToMove) return;

      const sortedDates = [...selectedDates].sort();
      const dateIndex = availableDates.indexOf(dateToMove);
      const currentPositionInSelected = sortedDates.indexOf(dateToMove);
      const targetDate = availableDates[dateIndex + direction];

      if (!targetDate) return;

      const isBlocked =
        direction === -1
          ? currentPositionInSelected > 0 &&
            targetDate === sortedDates[currentPositionInSelected - 1]
          : currentPositionInSelected < sortedDates.length - 1 &&
            targetDate === sortedDates[currentPositionInSelected + 1];

      if (!isBlocked) {
        const newDates = selectedDates.map((d) =>
          d === dateToMove ? targetDate : d,
        );

        setSelectedDates(newDates.sort());

        setActiveDate(targetDate);

        setKeyMovementAnchor(targetDate);
      }
    },
    [availableDates, selectedDates, setSelectedDates, setActiveDate],
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!keyMovementAnchor) return;
      if (["INPUT", "TEXTAREA"].includes(event.target.tagName)) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handleMove(keyMovementAnchor, -1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        handleMove(keyMovementAnchor, 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleMove, keyMovementAnchor]);

  return (
    <Group gap={{ base: "xs", sm: "md" }} justify="center" wrap="wrap">
      {selectedDates.map((date, index) => (
        <Group key={date} gap="xs" align="center" wrap="nowrap">
          <ActionIcon
            onClick={() => handleMove(date, -1)}
            disabled={
              availableDates.indexOf(date) === 0 ||
              selectedDates.includes(
                availableDates[availableDates.indexOf(date) - 1],
              )
            }
            variant="subtle"
            size={{ base: "sm", sm: "md" }}
          >
            <IconChevronLeft size={18} />
          </ActionIcon>

          <Box
            ref={index === 0 ? firstDateBoxRef : null}
            tabIndex={0}
            onFocus={() => {
              setKeyMovementAnchor(date);
              setActiveDate(date);
            }}
            onClick={() => {
              setKeyMovementAnchor(date);
              setActiveDate(date);
            }}
            style={{ outline: "none", cursor: "pointer" }}
          >
            <Group gap="xs" align="center" wrap="nowrap">
              <Text
                fw={500}
                c={date === activeDate ? "blue" : "dimmed"}
                size={{ base: "xs", sm: "sm" }}
                style={{
                  minWidth: "fit-content",
                  whiteSpace: "nowrap",
                  textDecoration:
                    date === keyMovementAnchor ? "underline" : "none",
                  textUnderlineOffset: "4px",
                }}
              >
                {date}
              </Text>

              {multi && (
                <ActionIcon
                  onClick={(e) => {
                    e.stopPropagation();
                    const newDates = selectedDates.filter((d) => d !== date);
                    setSelectedDates(newDates);
                    if (date === keyMovementAnchor && newDates.length > 0) {
                      const fallback = newDates[0];
                      setActiveDate(fallback);
                      setKeyMovementAnchor(fallback);
                    }
                  }}
                  disabled={selectedDates.length === 1}
                  variant="subtle"
                  size="xs"
                  color="red"
                >
                  <IconX size={10} />
                </ActionIcon>
              )}
            </Group>
          </Box>

          <ActionIcon
            onClick={() => handleMove(date, 1)}
            disabled={
              availableDates.indexOf(date) === availableDates.length - 1 ||
              selectedDates.includes(
                availableDates[availableDates.indexOf(date) + 1],
              )
            }
            variant="subtle"
            size={{ base: "sm", sm: "md" }}
          >
            <IconChevronRight size={18} />
          </ActionIcon>
        </Group>
      ))}

      {/* Add Date Button */}
      {multi && selectedDates.length < 5 && (
        <Button
          onClick={() => {
            const sorted = [...selectedDates].sort();
            const latestIdx = availableDates.indexOf(sorted[sorted.length - 1]);
            const earliestIdx = availableDates.indexOf(sorted[0]);

            let dateToAdd;
            if (latestIdx < availableDates.length - 1) {
              dateToAdd = availableDates[latestIdx + 1];
            } else if (earliestIdx > 0) {
              dateToAdd = availableDates[earliestIdx - 1];
            }

            if (dateToAdd && !selectedDates.includes(dateToAdd)) {
              setSelectedDates([...selectedDates, dateToAdd].sort());
              setActiveDate(dateToAdd);
              setKeyMovementAnchor(dateToAdd);
            }
          }}
          variant="light"
          size="xs"
          leftSection={<IconPlus size={14} />}
        >
          Add Date
        </Button>
      )}
    </Group>
  );
};

export default DateSelector;
