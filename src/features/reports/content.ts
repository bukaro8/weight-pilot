const URL_PATTERN = /https:\/\/[^\s<>{}\[\]"']+/giu;

type RenderableAssessment = {
  recommendedTreatment: "SEMAGLUTIDE" | "TIRZEPATIDE" | "REVIEW_REQUIRED";
  confidence: "HIGH" | "MODERATE" | "INSUFFICIENT_INFORMATION";
  reason: string;
  requiresMedicalReview: boolean;
};

function parseRenderableAssessment(content: string): RenderableAssessment | null {
  try {
    const value: unknown = JSON.parse(content);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const keys = ["recommendedTreatment", "confidence", "reason", "requiresMedicalReview"];
    if (Object.keys(record).length !== keys.length || keys.some((key) => !(key in record))) return null;
    if (!["SEMAGLUTIDE", "TIRZEPATIDE", "REVIEW_REQUIRED"].includes(String(record.recommendedTreatment))) return null;
    if (!["HIGH", "MODERATE", "INSUFFICIENT_INFORMATION"].includes(String(record.confidence))) return null;
    if (typeof record.reason !== "string" || record.reason.trim().split(/\s+/u).filter(Boolean).length > 60) return null;
    if (typeof record.requiresMedicalReview !== "boolean") return null;
    if (record.recommendedTreatment === "REVIEW_REQUIRED" && !record.requiresMedicalReview) return null;
    if (record.confidence === "INSUFFICIENT_INFORMATION" && (record.recommendedTreatment !== "REVIEW_REQUIRED" || !record.requiresMedicalReview)) return null;
    return record as RenderableAssessment;
  } catch {
    return null;
  }
}

const assessmentCopy = {
  en: {
    treatment: "Treatment evidence to discuss",
    confidence: "Evidence confidence",
    review: "Further medical review",
    yes: "Yes",
    no: "Not indicated by this comparison",
    treatments: {SEMAGLUTIDE: "Semaglutide", TIRZEPATIDE: "Tirzepatide", REVIEW_REQUIRED: "Further review required"},
    confidenceLevels: {HIGH: "High", MODERATE: "Moderate", INSUFFICIENT_INFORMATION: "Insufficient information"},
  },
  es: {
    treatment: "Evidencia sobre el tratamiento para comentar",
    confidence: "Grado de confianza en la evidencia",
    review: "Revisión médica adicional",
    yes: "Sí",
    no: "Esta comparación no la indica",
    treatments: {SEMAGLUTIDE: "Semaglutida", TIRZEPATIDE: "Tirzepatida", REVIEW_REQUIRED: "Se requiere una revisión adicional"},
    confidenceLevels: {HIGH: "Alta", MODERATE: "Moderada", INSUFFICIENT_INFORMATION: "Información insuficiente"},
  },
} as const;

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

export function renderReportContent(value: string, language: "en" | "es" = "en") {
  const normalized = normalizeReportContent(value);
  if (!normalized) return "";
  const assessment = parseRenderableAssessment(normalized);
  if (assessment) {
    const copy = assessmentCopy[language];
    const result = assessment;
    return `<section style="margin:0 0 20px;padding:18px;background:#EDF1F6;border-radius:14px"><p style="margin:0 0 6px;color:#5B6779;font-size:12px;font-weight:700;text-transform:uppercase">${escapeHtml(copy.treatment)}</p><h2 style="margin:0 0 14px;color:#142A47;font-family:Georgia,serif;font-size:22px">${escapeHtml(copy.treatments[result.recommendedTreatment])}</h2><p style="margin:0 0 12px;color:#1A2433;font-size:16px;line-height:1.7">${linkify(result.reason)}</p><p style="margin:0;color:#5B6779;font-size:13px"><strong>${escapeHtml(copy.confidence)}:</strong> ${escapeHtml(copy.confidenceLevels[result.confidence])}</p>${result.requiresMedicalReview ? `<p style="margin:10px 0 0;color:#142A47;font-size:14px;font-weight:700">${escapeHtml(copy.review)}: ${escapeHtml(copy.yes)}</p>` : ""}</section>`;
  }
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

export function reportContentToText(value: string, language: "en" | "es" = "en") {
  const result = parseRenderableAssessment(normalizeReportContent(value));
  if (result) {
    const copy = assessmentCopy[language];
    return `${copy.treatment}: ${copy.treatments[result.recommendedTreatment]}\n${result.reason}\n${copy.confidence}: ${copy.confidenceLevels[result.confidence]}\n${copy.review}: ${result.requiresMedicalReview ? copy.yes : copy.no}`;
  }
  return normalizeReportContent(value).replace(/^#{1,3}\s+/gmu, "");
}
