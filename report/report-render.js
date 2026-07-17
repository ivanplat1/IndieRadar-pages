function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function formatInlineMarkdown(line) {
  let formatted = escapeHtml(line);

  formatted = formatted.replaceAll(/`([^`]+)`/g, "<code>$1</code>");
  formatted = formatted.replaceAll(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  formatted = formatted.replaceAll(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  formatted = formatted.replaceAll(/_(.+?)_/g, "<em>$1</em>");

  return formatted;
}

function getIndentLevel(line) {
  const match = line.match(/^(\s+)/);

  if (!match?.[1]) {
    return 0;
  }

  return Math.floor(match[1].length / 3);
}

function trimIndent(line) {
  return line.replace(/^\s+/, "");
}

function isNumberedListLine(line) {
  return /^\d+\.\s/.test(trimIndent(line));
}

function isBulletLine(line) {
  const trimmed = trimIndent(line);

  return /^[-•]\s/.test(trimmed);
}

function markdownToHtml(markdown) {
  const lines = markdown.split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trimEnd();

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
      index += 1;
      continue;
    }

    if (isNumberedListLine(line)) {
      const items = [];

      while (index < lines.length && isNumberedListLine(lines[index].trimEnd())) {
        const current = trimIndent(lines[index].trimEnd()).replace(/^\d+\.\s/, "");
        const indent = getIndentLevel(lines[index].trimEnd());
        items.push(`<li class="indent-${indent}">${formatInlineMarkdown(current)}</li>`);
        index += 1;
      }

      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    if (isBulletLine(line)) {
      const items = [];

      while (index < lines.length && isBulletLine(lines[index].trimEnd())) {
        const current = trimIndent(lines[index].trimEnd()).replace(/^[-•]\s/, "");
        const indent = getIndentLevel(lines[index].trimEnd());
        items.push(`<li class="indent-${indent}">${formatInlineMarkdown(current)}</li>`);
        index += 1;
      }

      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    const indent = getIndentLevel(line);
    const content = trimIndent(line);

    if (indent > 0) {
      const className = content.startsWith("Примеры отзывов") || content.startsWith("Review examples")
        ? "note-label"
        : /^\d+\.\s/.test(content)
          ? "review-quote"
          : `indent-${indent}`;

      blocks.push(`<p class="${className}">${formatInlineMarkdown(content.replace(/^\d+\.\s/, ""))}</p>`);
      index += 1;
      continue;
    }

    blocks.push(`<p>${formatInlineMarkdown(content)}</p>`);
    index += 1;
  }

  return blocks.join("\n");
}
