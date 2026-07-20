function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function slugifyAnchor(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "section";
}

function parseMarkdownHeading(line, level) {
  const prefix = `${"#".repeat(level)} `;

  if (!line.startsWith(prefix)) {
    return null;
  }

  const raw = line.slice(prefix.length);
  const anchorMatch = raw.match(/\s*\{#([a-z0-9_-]+)\}\s*$/i);
  const anchor = anchorMatch?.[1] ?? null;
  const titlePart = anchor ? raw.replace(/\s*\{#[^}]+\}\s*$/, "") : raw;

  return { anchor, titlePart };
}

function renderHeading(level, titlePart, anchor) {
  const tag = `h${level}`;
  const id = escapeHtml(anchor ?? slugifyAnchor(titlePart.replace(/\*\*/g, "")));
  const extraClass = level === 3 && anchor?.startsWith("review-app-") ? ' class="app-review-heading"' : "";

  return `<${tag} id="${id}"${extraClass}>${formatInlineMarkdown(titlePart)}</${tag}>`;
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

function isNoteLabel(content) {
  const normalized = content.replace(/\*\*/g, "");

  return normalized.startsWith("Примеры отзывов") || normalized.startsWith("Review examples");
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

    if (/^-{3,}$/.test(line.trim())) {
      blocks.push('<hr class="app-divider">');
      index += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      const heading = parseMarkdownHeading(line, 1);
      blocks.push(renderHeading(1, heading?.titlePart ?? line.slice(2), heading?.anchor ?? null));
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      const heading = parseMarkdownHeading(line, 2);
      blocks.push(renderHeading(2, heading?.titlePart ?? line.slice(3), heading?.anchor ?? null));
      index += 1;
      continue;
    }

    if (line.startsWith("### ")) {
      const heading = parseMarkdownHeading(line, 3);
      blocks.push(renderHeading(3, heading?.titlePart ?? line.slice(4), heading?.anchor ?? null));
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
      const className = isNoteLabel(content)
        ? `note-label indent-${Math.min(indent, 4)}`
        : /^\d+\.\s/.test(content)
          ? `review-quote indent-${Math.min(indent, 4)}`
          : `indent-${Math.min(indent, 4)}`;

      blocks.push(`<p class="${className}">${formatInlineMarkdown(content.replace(/^\d+\.\s/, ""))}</p>`);
      index += 1;
      continue;
    }

    blocks.push(`<p>${formatInlineMarkdown(content)}</p>`);
    index += 1;
  }

  return blocks.join("\n");
}
