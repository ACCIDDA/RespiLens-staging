import { useEffect, useCallback, useRef, useState } from "react";
import { Group, Text, ActionIcon, Button, Box, Tooltip } from "@mantine/core";
import {
  IconChevronLeft,
  IconChevronRight,
  IconX,
  IconPlus,
} from "@tabler/icons-react";

// Same cap as the forecast-date drag/click interaction
const MAX_DATES = 20;

const DateSelector = ({
  availableDates,
  selectedDates,
  setSelectedDates,
  activeDate,
  setActiveDate,
  multi = true,
  // Compact: inline in a subtitle line (smaller, no remove button for a
  // single date, quieter "compare" button)
  compact = false,
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

  const handleAddDate = () => {
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
  };

  return (
    <Group
      gap={compact ? 6 : { base: "xs", sm: "md" }}
      justify={compact ? "flex-start" : "center"}
      wrap="wrap"
      // In compact mode the selector sits beside a label: let it shrink and
      // wrap onto extra lines instead of widening the page
      style={compact ? { flex: "1 1 0", minWidth: 0, rowGap: 2 } : undefined}
    >
      {selectedDates.map((date, index) => (
        <Group key={date} gap={compact ? 2 : "xs"} align="center" wrap="nowrap">
          <ActionIcon
            onClick={() => handleMove(date, -1)}
            disabled={
              availableDates.indexOf(date) === 0 ||
              selectedDates.includes(
                availableDates[availableDates.indexOf(date) - 1],
              )
            }
            variant="subtle"
            color={compact ? "gray" : undefined}
            className={compact ? "respilens-quiet-icon" : undefined}
            size={compact ? "sm" : { base: "sm", sm: "md" }}
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
                size={compact ? "sm" : { base: "xs", sm: "sm" }}
                style={{
                  minWidth: "fit-content",
                  whiteSpace: "nowrap",
                  textDecoration:
                    date === keyMovementAnchor &&
                    (!compact || selectedDates.length > 1)
                      ? "underline"
                      : "none",
                  textUnderlineOffset: "4px",
                }}
              >
                {date}
              </Text>

              {multi && !(compact && selectedDates.length === 1) && (
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
            color={compact ? "gray" : undefined}
            className={compact ? "respilens-quiet-icon" : undefined}
            size={compact ? "sm" : { base: "sm", sm: "md" }}
          >
            <IconChevronRight size={18} />
          </ActionIcon>
        </Group>
      ))}

      {/* Add Date Button (icon-only in compact mode) */}
      {multi &&
        selectedDates.length < MAX_DATES &&
        (compact ? (
          <Tooltip label="Add a date to compare" openDelay={300}>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handleAddDate}
              aria-label="Add a date to compare"
            >
              <IconPlus size={16} />
            </ActionIcon>
          </Tooltip>
        ) : (
          <Button
            onClick={handleAddDate}
            variant="light"
            size="xs"
            leftSection={<IconPlus size={14} />}
          >
            Add Date
          </Button>
        ))}
    </Group>
  );
};

export default DateSelector;
