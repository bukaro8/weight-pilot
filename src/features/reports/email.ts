import "server-only";

import {Resend} from "resend";

import {escapeHtml, getClearTreatmentSuggestion, renderReportContent, reportContentToText} from "@/features/reports/content";
import type {ReportLanguage, ReportPharmacyEstimate, ReportReferenceEstimate} from "@/features/reports/types";
import type {SavingsComparisonSnapshot} from "@/features/reports/savings-comparison";

const emailCopy = {
  en: {
    subject: "Your WeightPilot guidance report",
    greeting: (name: string) => `Hello ${name},`,
    intro: "Your administrator-reviewed personalised guidance report is ready.",
    heading: "Your personalised guidance report",
    disclaimerTitle: "Important information",
    disclaimer: "This report provides educational information and guidance. It is not a diagnosis, prescription or substitute for advice from a qualified healthcare professional. Treatment suitability depends on a complete individual assessment.",
    footer: "WeightPilot · Private, personalised weight-management information and guidance",
    summary: "Assessment summary", current: "Current weight", target: "Target weight", bmi: "BMI", targetChange: "Target change",
    considerations: "Health circumstances selected", noConsiderations: "No specific health circumstances were selected.",
    medicationReported: "Medication information was provided.", noMedication: "No current medication was reported.", medicationUnclear: "Medication information was not clear in the questionnaire.",
    referenceTitle: "Illustrative WeightPilot reference estimate", treatmentCost: "Treatment reference", deliveryCost: "Delivery reference", totalCost: "Estimated total", referenceNote: "This is an illustrative estimate based on administrator-managed reference prices, not a pharmacy quote or offer to sell. It assumes one purchase and delivery per month. Reference prices last updated",
    pharmacyTitle: "Saved pharmacy reference price", pharmacyAsOf: (date: string) => `Source checked ${date}. This is a dated reference, not a live or guaranteed price.`, source: "View source",
    messages: "Continue the conversation securely", messagesText: "You can view this report and contact WeightPilot in your private conversation.",
    treatmentCta: "Explore treatment information",
    savingsTitle: "Your potential savings over 16 months",
    comparisonTreatment: (treatment: "SEMAGLUTIDE" | "TIRZEPATIDE", hypothetical: boolean) => `${hypothetical ? "Hypothetical comparison only" : "Same-treatment scenario"} · ${treatment === "SEMAGLUTIDE" ? "Semaglutide" : "Tirzepatide"}`,
    weightPilotTotal: "WeightPilot reference total",
    pharmacyTotal: "Boots Online Doctor reference total",
    difference: "Illustrative difference",
    lower: "lower", higher: "higher", savingsSource: "Saved pharmacy reference",
    savingsNote: "Illustrative medicine costs for a hypothetical standard escalation scenario only. Delivery, prescribing and other costs may be excluded. Pharmacy prices may change and included services may differ. This comparison does not indicate treatment suitability.",
  },
  es: {
    subject: "Tu informe de orientación de WeightPilot",
    greeting: (name: string) => `Hola ${name},`,
    intro: "Tu informe de orientación personalizada, revisado por el administrador, ya está listo.",
    heading: "Tu informe de orientación personalizada",
    disclaimerTitle: "Información importante",
    disclaimer: "Este informe ofrece información educativa y orientación. No constituye un diagnóstico, una prescripción ni sustituye el asesoramiento de un profesional sanitario cualificado. La idoneidad de un tratamiento depende de una evaluación individual completa.",
    footer: "WeightPilot · Información y orientación privadas y personalizadas para el control de peso",
    summary: "Resumen de la evaluación", current: "Peso actual", target: "Peso objetivo", bmi: "IMC", targetChange: "Cambio objetivo",
    considerations: "Circunstancias de salud seleccionadas", noConsiderations: "No se seleccionaron circunstancias de salud específicas.",
    medicationReported: "Se aportó información sobre medicación.", noMedication: "No se indicó medicación actual.", medicationUnclear: "La información sobre medicación no quedó clara en el cuestionario.",
    referenceTitle: "Estimación orientativa de referencia de WeightPilot", treatmentCost: "Referencia del tratamiento", deliveryCost: "Referencia de entrega", totalCost: "Total estimado", referenceNote: "Es una estimación orientativa basada en precios de referencia gestionados por el administrador; no es un presupuesto de farmacia ni una oferta de venta. Supone una compra y entrega al mes. Precios de referencia actualizados el",
    pharmacyTitle: "Precio de referencia de farmacia guardado", pharmacyAsOf: (date: string) => `Fuente consultada el ${date}. Es una referencia fechada, no un precio actual ni garantizado.`, source: "Ver fuente",
    messages: "Continúa la conversación de forma segura", messagesText: "Puedes consultar este informe y contactar con WeightPilot en tu conversación privada.",
    treatmentCta: "Explorar información sobre el tratamiento",
    savingsTitle: "Tu posible ahorro en 16 meses",
    comparisonTreatment: (treatment: "SEMAGLUTIDE" | "TIRZEPATIDE", hypothetical: boolean) => `${hypothetical ? "Comparación hipotética únicamente" : "Escenario del mismo tratamiento"} · ${treatment === "SEMAGLUTIDE" ? "Semaglutida" : "Tirzepatida"}`,
    weightPilotTotal: "Total de referencia de WeightPilot",
    pharmacyTotal: "Total de referencia de Boots Online Doctor",
    difference: "Diferencia ilustrativa",
    lower: "menos", higher: "más", savingsSource: "Referencia de farmacia guardada",
    savingsNote: "Costes ilustrativos del medicamento para un escenario hipotético de escalada estándar. Pueden excluirse los gastos de envío, prescripción y otros costes. Los precios de farmacia pueden cambiar y los servicios incluidos pueden diferir. Esta comparación no indica la idoneidad de un tratamiento.",
  },
} as const;

type Summary = {currentWeightKg: number | null; targetWeightKg: number | null; bmi: number | null; targetLossPercentage: number | null; healthConsiderations: string[]; medicationStatus: "REPORTED" | "NONE_REPORTED" | "UNCLEAR"};
type EmailExtras = {summary?: Summary; referenceEstimate?: ReportReferenceEstimate | null; pharmacyEstimate?: ReportPharmacyEstimate | null; savingsComparison?: SavingsComparisonSnapshot | null; messagesUrl?: string; treatmentsUrl?: string};
function pounds(pence: number) { return `£${(pence / 100).toFixed(2)}`; }
function safeHttps(value: string | undefined) {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null; } catch { return null; }
}

export function renderGuidanceReportEmail(input: {language: ReportLanguage; memberName: string; content: string} & EmailExtras) {
  const translated = emailCopy[input.language];
  const safeName = input.memberName;
  const reportHtml = renderReportContent(input.content, input.language);
  const reportText = reportContentToText(input.content, input.language);
  const summary = input.summary;
  const reference = input.referenceEstimate;
  const pharmacy = input.pharmacyEstimate && safeHttps(input.pharmacyEstimate.sourceUrl) ? input.pharmacyEstimate : null;
  const comparison = input.savingsComparison && safeHttps(input.savingsComparison.sourceUrl) ? input.savingsComparison : null;
  const messagesUrl = safeHttps(input.messagesUrl ?? undefined);
  const treatmentsUrl = getClearTreatmentSuggestion(input.content) ? safeHttps(input.treatmentsUrl) : null;
  const healthText = summary?.healthConsiderations.length ? `${translated.considerations}: ${summary.healthConsiderations.join(", ")}` : translated.noConsiderations;
  const medicationText = summary?.medicationStatus === "REPORTED" ? translated.medicationReported : summary?.medicationStatus === "UNCLEAR" ? translated.medicationUnclear : translated.noMedication;
  const summaryHtml = summary ? `<section style="margin:0 0 24px;padding:18px;background:#EDF1F6;border-radius:14px"><h2 style="margin:0 0 12px;color:#142A47;font-family:Georgia,serif;font-size:21px">${escapeHtml(translated.summary)}</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:1.5;color:#1A2433"><tr><td style="padding:5px 8px 5px 0"><strong>${escapeHtml(translated.current)}:</strong> ${summary.currentWeightKg === null ? "—" : `${summary.currentWeightKg} kg`}</td><td style="padding:5px 0"><strong>${escapeHtml(translated.target)}:</strong> ${summary.targetWeightKg === null ? "—" : `${summary.targetWeightKg} kg`}</td></tr><tr><td style="padding:5px 8px 5px 0"><strong>${escapeHtml(translated.bmi)}:</strong> ${summary.bmi === null ? "—" : summary.bmi.toFixed(1)}</td><td style="padding:5px 0"><strong>${escapeHtml(translated.targetChange)}:</strong> ${summary.targetLossPercentage === null ? "—" : `${summary.targetLossPercentage.toFixed(1)}%`}</td></tr></table><p style="margin:10px 0 0;color:#5B6779;font-size:13px;line-height:1.5">${escapeHtml(healthText)}<br>${escapeHtml(medicationText)}</p></section>` : "";
  const referenceHtml = reference ? `<section style="margin:0 0 18px;padding:18px;border:1px solid #E6DFD9;border-radius:14px"><h2 style="margin:0 0 8px;color:#142A47;font-family:Georgia,serif;font-size:20px">${escapeHtml(translated.referenceTitle)}</h2><p style="margin:0;color:#1A2433;font-size:14px;line-height:1.6">${escapeHtml(translated.treatmentCost)}: ${escapeHtml(pounds(reference.treatmentCostPence))}<br>${escapeHtml(translated.deliveryCost)}: ${escapeHtml(pounds(reference.deliveryCostPence))}<br><strong>${escapeHtml(translated.totalCost)}: ${escapeHtml(pounds(reference.totalCostPence))}</strong> · ${reference.durationMonths} ${input.language === "es" ? "meses" : "months"}</p><p style="margin:8px 0 0;color:#5B6779;font-size:12px;line-height:1.5">${escapeHtml(translated.referenceNote)} ${escapeHtml(reference.pricingUpdatedAt.slice(0, 10))}.</p></section>` : "";
  const pharmacyHtml = pharmacy ? `<section style="margin:0 0 18px;padding:18px;background:#F6ECE8;border-radius:14px"><h2 style="margin:0 0 8px;color:#142A47;font-family:Georgia,serif;font-size:20px">${escapeHtml(translated.pharmacyTitle)}</h2><p style="margin:0;color:#1A2433;font-size:15px;line-height:1.6"><strong>${escapeHtml(pharmacy.sourceName)}${pharmacy.strength ? ` · ${escapeHtml(pharmacy.strength)}` : ""}:</strong> ${escapeHtml(pounds(pharmacy.amountPence))} · ${pharmacy.periodMonths} ${pharmacy.periodMonths === 1 ? (input.language === "es" ? "mes" : "month") : (input.language === "es" ? "meses" : "months")}</p><p style="margin:8px 0 0;color:#5B6779;font-size:12px;line-height:1.5">${escapeHtml(translated.pharmacyAsOf(pharmacy.asOfDate))} <a href="${escapeHtml(safeHttps(pharmacy.sourceUrl) ?? "")}" style="color:#1E3A5F">${escapeHtml(translated.source)}</a></p></section>` : "";
  const differenceMagnitude = comparison ? Math.abs(comparison.differencePence) : 0;
  const direction = comparison && comparison.differencePence >= 0 ? translated.lower : translated.higher;
  const differencePercent = comparison ? Math.abs(comparison.percentageLower) : 0;
  const savingsHtml = comparison ? `<section style="margin:0 0 20px;padding:20px;background:#F6ECE8;border:1px solid #E9C9C0;border-radius:16px"><p style="margin:0 0 5px;color:#142A47;font-family:Georgia,serif;font-size:21px;font-weight:700">${escapeHtml(translated.savingsTitle)}</p><p style="margin:0 0 12px;color:#5B6779;font-size:13px">${escapeHtml(translated.comparisonTreatment(comparison.treatment, comparison.hypothetical ?? false))}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="color:#1A2433;font-size:14px;line-height:1.6"><tr><td style="padding:5px 0">${escapeHtml(translated.weightPilotTotal)}</td><td align="right" style="padding:5px 0;font-weight:700">${escapeHtml(pounds(comparison.weightPilotTreatmentCostPence))}</td></tr><tr><td style="padding:5px 0">${escapeHtml(translated.pharmacyTotal)}</td><td align="right" style="padding:5px 0;font-weight:700">${escapeHtml(pounds(comparison.pharmacyTreatmentCostPence))}</td></tr></table><p style="margin:14px 0 8px;padding:12px;border-radius:10px;background:#1E3A5F;color:#fff;font-size:16px;font-weight:700">${escapeHtml(translated.difference)}: ${escapeHtml(pounds(differenceMagnitude))} (${differencePercent.toFixed(1)}% ${escapeHtml(direction)})</p><p style="margin:0;color:#5B6779;font-size:12px;line-height:1.5">${escapeHtml(translated.savingsSource)} · ${escapeHtml(comparison.sourceName)} · ${escapeHtml(comparison.sourceReferenceDate)} · <a href="${escapeHtml(safeHttps(comparison.sourceUrl) ?? "")}" style="color:#1E3A5F">${escapeHtml(translated.source)}</a><br>${escapeHtml(translated.savingsNote)}</p></section>` : "";
  const messagesHtml = messagesUrl ? `<section style="margin:0 0 8px;padding:20px;background:#1E3A5F;border-radius:14px"><p style="margin:0 0 8px;color:#fff;font-family:Georgia,serif;font-size:20px;font-weight:700">${escapeHtml(translated.messages)}</p><p style="margin:0 0 16px;color:#fff;font-size:14px;line-height:1.5">${escapeHtml(translated.messagesText)}</p><a href="${escapeHtml(messagesUrl)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#E9C9C0;color:#142A47;font-weight:700;text-decoration:none">${escapeHtml(input.language === "es" ? "Abrir mensajes privados" : "Open private messages")}</a></section>` : "";
  const treatmentsHtml = treatmentsUrl ? `<section style="margin:0 0 20px;padding:18px;background:#F6ECE8;border:1px solid #E9C9C0;border-radius:14px"><p style="margin:0 0 12px;color:#142A47;font-size:15px;line-height:1.5">${escapeHtml(translated.treatmentCta)}</p><a href="${escapeHtml(treatmentsUrl)}" style="display:inline-block;padding:13px 20px;border-radius:999px;background:#1E3A5F;color:#FFFFFF;font-weight:700;text-decoration:none">${escapeHtml(translated.treatmentCta)} →</a></section>` : "";
  return {
    subject: translated.subject,
    html: `<!doctype html><html lang="${input.language}"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#FBF8F5;color:#1A2433;font-family:Inter,Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#FBF8F5"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#FFFFFF;border:1px solid #E6DFD9;border-radius:20px;overflow:hidden"><tr><td style="height:8px;background:#E9C9C0"></td></tr><tr><td style="padding:32px 24px 12px"><p style="margin:0 0 30px;color:#1E3A5F;font-family:Georgia,serif;font-size:27px;font-weight:700">WeightPilot</p><p style="margin:0 0 10px;font-size:16px;line-height:1.6">${escapeHtml(translated.greeting(safeName))}</p><h1 style="margin:0 0 14px;color:#142A47;font-family:Georgia,serif;font-size:30px;line-height:1.2">${escapeHtml(translated.heading)}</h1><p style="margin:0 0 26px;color:#5B6779;font-size:16px;line-height:1.65">${escapeHtml(translated.intro)}</p><div style="height:1px;background:#E6DFD9"></div></td></tr><tr><td style="padding:20px 24px 8px">${summaryHtml}${reportHtml}${savingsHtml}${referenceHtml}${pharmacyHtml}${treatmentsHtml}${messagesHtml}</td></tr><tr><td style="padding:16px 24px 30px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F6ECE8;border-radius:14px"><tr><td style="padding:18px"><p style="margin:0 0 6px;color:#142A47;font-size:14px;font-weight:700">${escapeHtml(translated.disclaimerTitle)}</p><p style="margin:0;color:#5B6779;font-size:13px;line-height:1.6">${escapeHtml(translated.disclaimer)}</p></td></tr></table></td></tr><tr><td style="padding:22px 24px;background:#1E3A5F"><p style="margin:0;color:#FFFFFF;font-family:Georgia,serif;font-size:20px;font-weight:700">WeightPilot</p><p style="margin:7px 0 0;color:#FFFFFFCC;font-size:12px;line-height:1.5">${escapeHtml(translated.footer)}</p></td></tr></table></td></tr></table></body></html>`,
    text: `${translated.greeting(input.memberName)}\n\n${translated.intro}\n\n${translated.heading}\n${summary ? `\n${translated.current}: ${summary.currentWeightKg ?? "—"} kg\n${translated.target}: ${summary.targetWeightKg ?? "—"} kg\n${translated.bmi}: ${summary.bmi?.toFixed(1) ?? "—"}\n${translated.targetChange}: ${summary.targetLossPercentage === null ? "—" : `${summary.targetLossPercentage.toFixed(1)}%`}\n${healthText}\n${medicationText}` : ""}\n\n${reportText}${comparison ? `\n\n${translated.savingsTitle}\n${translated.comparisonTreatment(comparison.treatment, comparison.hypothetical ?? false)}\n${translated.weightPilotTotal}: ${pounds(comparison.weightPilotTreatmentCostPence)}\n${translated.pharmacyTotal}: ${pounds(comparison.pharmacyTreatmentCostPence)}\n${translated.difference}: ${pounds(differenceMagnitude)} (${differencePercent.toFixed(1)}% ${direction})\n${translated.savingsSource}: ${comparison.sourceName} · ${comparison.sourceReferenceDate}\n${translated.savingsNote}` : ""}${reference ? `\n\n${translated.referenceTitle}: ${pounds(reference.totalCostPence)} / ${reference.durationMonths} months. ${translated.referenceNote}` : ""}${pharmacy ? `\n\n${translated.pharmacyTitle}: ${pharmacy.sourceName}${pharmacy.strength ? ` · ${pharmacy.strength}` : ""} ${pounds(pharmacy.amountPence)} / ${pharmacy.periodMonths} ${pharmacy.periodMonths === 1 ? (input.language === "es" ? "mes" : "month") : (input.language === "es" ? "meses" : "months")}. ${translated.pharmacyAsOf(pharmacy.asOfDate)} ${pharmacy.sourceUrl}` : ""}${treatmentsUrl ? `\n\n${translated.treatmentCta}: ${treatmentsUrl}` : ""}${messagesUrl ? `\n\n${translated.messages}: ${messagesUrl}` : ""}\n\n${translated.disclaimerTitle}\n${translated.disclaimer}\n\n${translated.footer}`,
  };
}

export async function deliverGuidanceReport(input: {reportId: string; language: ReportLanguage; memberName: string; recipient: string; content: string} & EmailExtras) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return {ok: false as const, uncertain: false as const, failureCode: "EMAIL_NOT_CONFIGURED"};
  const email = renderGuidanceReportEmail(input);
  try {
    const result = await new Resend(apiKey).emails.send({from, to: input.recipient, ...email}, {idempotencyKey: `weightpilot-report-${input.reportId}`, signal: AbortSignal.timeout(20_000)});
    if (result.error) return {ok: false as const, uncertain: false as const, failureCode: "PROVIDER_REJECTED"};
    if (!result.data?.id) return {ok: false as const, uncertain: true as const, failureCode: "PROVIDER_RESPONSE_UNCERTAIN"};
    return {ok: true as const, providerMessageId: result.data.id};
  } catch {
    return {ok: false as const, uncertain: true as const, failureCode: "PROVIDER_RESPONSE_UNCERTAIN"};
  }
}

export async function sendReviewRequestNotification(input: {recipient: string; language: ReportLanguage; dashboardUrl: string; requestId: string}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return;
  const isSpanish = input.language === "es";
  const subject = isSpanish ? "Nueva solicitud de revisión en WeightPilot" : "New WeightPilot review request";
  const heading = isSpanish ? "Hay una nueva solicitud de revisión" : "A new review request is ready";
  const body = isSpanish ? "Inicia sesión en el panel seguro para revisar la solicitud. Este aviso no contiene información del cuestionario." : "Sign in to the secure dashboard to review the request. This notification contains no questionnaire information.";
  const button = isSpanish ? "Abrir panel seguro" : "Open secure dashboard";
  try {
    await new Resend(apiKey).emails.send({
      from, to: input.recipient, subject,
      html: `<!doctype html><html lang="${input.language}"><body style="margin:0;background:#FBF8F5;font-family:Arial,sans-serif;color:#1A2433"><table role="presentation" width="100%"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #E6DFD9;border-radius:18px"><tr><td style="padding:32px"><p style="margin:0 0 24px;color:#1E3A5F;font-family:Georgia,serif;font-size:25px;font-weight:700">WeightPilot</p><h1 style="margin:0 0 14px;color:#142A47;font-family:Georgia,serif;font-size:28px">${escapeHtml(heading)}</h1><p style="margin:0 0 24px;color:#5B6779;line-height:1.6">${escapeHtml(body)}</p><a href="${escapeHtml(input.dashboardUrl)}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#1E3A5F;color:#fff;font-weight:700;text-decoration:none">${escapeHtml(button)}</a></td></tr></table></td></tr></table></body></html>`,
      text: `${heading}\n\n${body}\n\n${input.dashboardUrl}`,
    }, {idempotencyKey: `weightpilot-review-notification-${input.requestId}`});
  } catch {
    // A notification failure must not prevent a member from requesting review.
  }
}
