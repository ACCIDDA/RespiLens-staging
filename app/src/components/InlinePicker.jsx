import { useEffect, useRef, useState } from "react";
import { Combobox, Tooltip, UnstyledButton, useCombobox } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import {
  isOwnedKeyEvent,
  useKeyboardShortcut,
} from "../hooks/useKeyboardShortcut";
import ShortcutHint from "./ShortcutHint";

// A dropdown that reads as part of a sentence: the current value is plain
// (underlined) text inheriting the surrounding font, so a heading like
// "Flu hospitalizations in United States" doubles as the chart's controls.
const InlinePicker = ({
  value,
  data,
  onChange,
  searchable = false,
  placeholder = "Select",
  renderOption,
  dropdownWidth = 280,
  // `shortcut`: a key that opens the picker, named with `shortcutLabel` in
  // the button's tooltip
  shortcut = null,
  shortcutLabel = "",
  // `stepKeys`: ArrowUp / ArrowDown pick the previous / next option.
  // "first": this picker takes the arrows before any other stepping picker
  // (the finer of two location levels)
  stepKeys = false,
  "aria-label": ariaLabel,
}) => {
  const [search, setSearch] = useState("");
  const targetRef = useRef(null);
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearch("");
    },
    onDropdownOpen: () => {
      if (searchable) combobox.focusSearchInput();
    },
  });

  const query = search.toLowerCase().trim();
  const options = query
    ? data.filter(
        (item) =>
          item.label.toLowerCase().includes(query) ||
          item.value.toLowerCase() === query,
      )
    : data;

  // Keep the first match highlighted so Enter picks it
  useEffect(() => {
    if (query) combobox.selectFirstOption();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const current = data.find((item) => item.value === value);
  const isStatic = data.length <= 1;

  // Focus the button first so arrow keys and Enter drive the list even
  // without a search box
  useKeyboardShortcut(
    shortcut,
    () => {
      targetRef.current?.focus();
      combobox.openDropdown();
      requestAnimationFrame(() => combobox.selectActiveOption());
    },
    Boolean(shortcut) && !isStatic,
  );

  const stepEnabled = stepKeys && !isStatic;
  useEffect(() => {
    if (!stepEnabled) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      if (event.shiftKey || isOwnedKeyEvent(event)) return;
      const index = data.findIndex((item) => item.value === value);
      if (index === -1) return;
      const next = data[index + (event.key === "ArrowUp" ? -1 : 1)];
      event.preventDefault();
      if (next) onChange(next.value);
    };
    const capture = stepKeys === "first";
    window.addEventListener("keydown", handleKeyDown, capture);
    return () => window.removeEventListener("keydown", handleKeyDown, capture);
  }, [stepEnabled, stepKeys, data, value, onChange]);

  if (isStatic) {
    return <span>{current?.label ?? placeholder}</span>;
  }

  // The tooltip wraps the whole picker: nested inside Combobox.Target, both
  // would clone the button and the tooltip never opens
  return (
    <Tooltip
      label={<ShortcutHint label={shortcutLabel} shortcut={shortcut} />}
      disabled={!shortcut || combobox.dropdownOpened}
      openDelay={400}
    >
      <span>
        <Combobox
          store={combobox}
          width={dropdownWidth}
          position="bottom-start"
          shadow="md"
          onOptionSubmit={(next) => {
            onChange(next);
            combobox.closeDropdown();
          }}
        >
          <Combobox.Target targetType="button">
            <UnstyledButton
              ref={targetRef}
              className="respilens-inline-picker"
              onClick={() => combobox.toggleDropdown()}
              aria-label={ariaLabel}
              aria-keyshortcuts={shortcut?.toUpperCase()}
            >
              {current?.label ?? placeholder}
              <IconChevronDown className="respilens-inline-picker-caret" />
            </UnstyledButton>
          </Combobox.Target>

          <Combobox.Dropdown>
            {searchable && (
              <Combobox.Search
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Search…"
              />
            )}
            <Combobox.Options mah={360} style={{ overflowY: "auto" }}>
              {options.length === 0 ? (
                <Combobox.Empty>Nothing found</Combobox.Empty>
              ) : (
                options.map((item) => (
                  <Combobox.Option
                    key={item.value}
                    value={item.value}
                    active={item.value === value}
                  >
                    {renderOption ? renderOption(item) : item.label}
                  </Combobox.Option>
                ))
              )}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
      </span>
    </Tooltip>
  );
};

export default InlinePicker;
