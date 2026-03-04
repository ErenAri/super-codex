export function extractPurposeSummary(scaffold: string, maxLength = 110): string | null {
  const lines = scaffold.split(/\r?\n/);
  const purposeHeadingIndex = lines.findIndex((line) => /^##\s+Purpose\b/i.test(line.trim()));
  if (purposeHeadingIndex >= 0) {
    const paragraph = extractParagraph(lines, purposeHeadingIndex + 1);
    if (paragraph) {
      return truncateText(firstSentence(paragraph), maxLength);
    }
  }

  // Fallback to first paragraph after top-level heading for base workflow scaffolds.
  const headingIndex = lines.findIndex((line) => /^#\s+/.test(line.trim()));
  if (headingIndex >= 0) {
    const paragraph = extractParagraph(lines, headingIndex + 1);
    if (paragraph) {
      return truncateText(firstSentence(paragraph), maxLength);
    }
  }

  return null;
}

export function formatDisplayName(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function extractParagraph(lines: string[], startIndex: number): string | null {
  const collected: string[] = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      if (collected.length > 0) {
        break;
      }
      continue;
    }

    if (/^#{1,6}\s+/.test(line)) {
      if (collected.length > 0) {
        break;
      }
      continue;
    }

    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      if (collected.length === 0) {
        continue;
      }
      break;
    }

    collected.push(line);
  }

  if (collected.length === 0) {
    return null;
  }

  return collected.join(" ").replace(/\s+/g, " ").trim();
}

function firstSentence(text: string): string {
  const match = text.match(/(.+?[.!?])(\s|$)/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return text.trim();
}
