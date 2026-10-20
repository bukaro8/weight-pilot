const URL_PATTERN = /https:\/\/[^\s<>{}\[\]"']+/giu;

export function normalizeReportContent(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 30_000);
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);
}

function linkify(value: string) {
  let cursor = 0;
  let html = "";
  for (const match of value.matchAll(URL_PATTERN)) {
    const index = match.index ?? 0;
    const candidate = match[0].replace(/[),.;:!?]+$/u, "");
    let safeUrl: URL | undefined;
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === "https:") safeUrl = parsed;
    } catch { /* Render invalid URLs as text. */ }
    html += escapeHtml(value.slice(cursor, index));
    html += safeUrl
      ? `<a href="${escapeHtml(safeUrl.toString())}" style="color:#1E3A5F;text-decoration:underline;word-break:break-word">${escapeHtml(candidate)}</a>`
      : escapeHtml(candidate);
    cursor = index + candidate.length;
  }
  return html + escapeHtml(value.slice(cursor));
}

export function renderReportContent(value: string) {
  const normalized = normalizeReportContent(value);
  if (!normalized) return "";
  return normalized.split(/\n{2,}/u).map((block) => {
    const lines = block.split("\n");
    const isList = lines.every((line) => /^\s*[-•]\s+/u.test(line));
    if (isList) {
      return `<ul style="margin:0 0 20px;padding-left:22px;color:#1A2433;font-size:16px;line-height:1.7">${lines.map((line) => `<li style="margin:0 0 6px">${linkify(line.replace(/^\s*[-•]\s+/u, ""))}</li>`).join("")}</ul>`;
    }
    const heading = lines.length === 1 && /^#{1,3}\s+/u.test(lines[0]);
    if (heading) return `<h2 style="margin:26px 0 10px;color:#142A47;font-family:Georgia,serif;font-size:22px;line-height:1.3">${linkify(lines[0].replace(/^#{1,3}\s+/u, ""))}</h2>`;
    return `<p style="margin:0 0 20px;color:#1A2433;font-size:16px;line-height:1.7">${lines.map(linkify).join("<br>")}</p>`;
  }).join("");
}

export function reportContentToText(value: string) {
  return normalizeReportContent(value).replace(/^#{1,3}\s+/gmu, "");
}
