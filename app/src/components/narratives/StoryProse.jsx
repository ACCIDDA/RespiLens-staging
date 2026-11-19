import { Anchor, List, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";

// A small Markdown subset for narrative slides: paragraphs, "- " and "1. "
// lists, "### " subheadings, **bold**, *italic* and [links](/path). Enough
// for prose written in a data file, rendered as real elements (so links are
// router links and lists are lists to a screen reader) without a parser
// dependency.

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;

const renderInline = (text, keyPrefix) =>
  text.split(INLINE).map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const [, label, href] = link;
      return href.startsWith("/") ? (
        <Anchor key={key} component={Link} to={href} inherit>
          {label}
        </Anchor>
      ) : (
        <Anchor
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          inherit
        >
          {label}
        </Anchor>
      );
    }
    return part;
  });

const parseBlocks = (source) => {
  const blocks = [];
  source
    .trim()
    .split(/\n\s*\n/)
    .filter((chunk) => chunk.trim())
    .forEach((chunk) => {
      const lines = chunk.split("\n").map((line) => line.trim());
      if (lines.every((line) => /^- /.test(line))) {
        blocks.push({ type: "ul", items: lines.map((l) => l.slice(2)) });
      } else if (lines.every((line) => /^\d+\. /.test(line))) {
        blocks.push({
          type: "ol",
          items: lines.map((l) => l.replace(/^\d+\. /, "")),
        });
      } else if (lines.length === 1 && lines[0].startsWith("### ")) {
        blocks.push({ type: "h", text: lines[0].slice(4) });
      } else {
        blocks.push({ type: "p", text: lines.join(" ") });
      }
    });
  return blocks;
};

const StoryProse = ({ children }) => {
  if (!children) return null;
  return (
    <div className="respilens-story-prose">
      {parseBlocks(children).map((block, index) => {
        const key = `b${index}`;
        if (block.type === "h") {
          return (
            <Title key={key} order={3} fz="md" fw={700}>
              {renderInline(block.text, key)}
            </Title>
          );
        }
        if (block.type === "ul" || block.type === "ol") {
          return (
            <List key={key} type={block.type === "ol" ? "ordered" : undefined}>
              {block.items.map((item, itemIndex) => (
                <List.Item key={`${key}-${itemIndex}`}>
                  {renderInline(item, `${key}-${itemIndex}`)}
                </List.Item>
              ))}
            </List>
          );
        }
        return (
          <Text key={key} inherit>
            {renderInline(block.text, key)}
          </Text>
        );
      })}
    </div>
  );
};

export default StoryProse;
