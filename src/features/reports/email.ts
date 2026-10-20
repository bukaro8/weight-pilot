import "server-only";

import {Resend} from "resend";

import {escapeHtml, renderReportContent, reportContentToText} from "@/features/reports/content";
import type {ReportLanguage} from "@/features/reports/types";

const emailCopy = {
  en: {
    subject: "Your WeightPilot guidance report",
    greeting: (name: string) => `Hello ${name},`,
    intro: "Your administrator-reviewed personalised guidance report is ready.",
    heading: "Your personalised guidance report",
    disclaimerTitle: "Important information",
    disclaimer: "This report provides educational information and guidance. It is not a diagnosis, prescription or substitute for advice from a qualified healthcare professional. Treatment suitability depends on a complete individual assessment.",
    footer: "WeightPilot · Private, personalised weight-management information and guidance",
  },
  es: {
    subject: "Tu informe de orientación de WeightPilot",
    greeting: (name: string) => `Hola ${name},`,
    intro: "Tu informe de orientación personalizada, revisado por el administrador, ya está listo.",
    heading: "Tu informe de orientación personalizada",
    disclaimerTitle: "Información importante",
    disclaimer: "Este informe ofrece información educativa y orientación. No constituye un diagnóstico, una prescripción ni sustituye el asesoramiento de un profesional sanitario cualificado. La idoneidad de un tratamiento depende de una evaluación individual completa.",
    footer: "WeightPilot · Información y orientación privadas y personalizadas para el control de peso",
  },
} as const;

export function renderGuidanceReportEmail(input: {language: ReportLanguage; memberName: string; content: string}) {
  const translated = emailCopy[input.language];
  const safeName = input.memberName;
  const reportHtml = renderReportContent(input.content);
  return {
    subject: translated.subject,
    html: `<!doctype html><html lang="${input.language}"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#FBF8F5;color:#1A2433;font-family:Inter,Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#FBF8F5"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#FFFFFF;border:1px solid #E6DFD9;border-radius:20px;overflow:hidden"><tr><td style="height:8px;background:#E9C9C0"></td></tr><tr><td style="padding:32px 24px 12px"><p style="margin:0 0 30px;color:#1E3A5F;font-family:Georgia,serif;font-size:27px;font-weight:700">WeightPilot</p><p style="margin:0 0 10px;font-size:16px;line-height:1.6">${escapeHtml(translated.greeting(safeName))}</p><h1 style="margin:0 0 14px;color:#142A47;font-family:Georgia,serif;font-size:30px;line-height:1.2">${escapeHtml(translated.heading)}</h1><p style="margin:0 0 26px;color:#5B6779;font-size:16px;line-height:1.65">${escapeHtml(translated.intro)}</p><div style="height:1px;background:#E6DFD9"></div></td></tr><tr><td style="padding:20px 24px 8px">${reportHtml}</td></tr><tr><td style="padding:16px 24px 30px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F6ECE8;border-radius:14px"><tr><td style="padding:18px"><p style="margin:0 0 6px;color:#142A47;font-size:14px;font-weight:700">${escapeHtml(translated.disclaimerTitle)}</p><p style="margin:0;color:#5B6779;font-size:13px;line-height:1.6">${escapeHtml(translated.disclaimer)}</p></td></tr></table></td></tr><tr><td style="padding:22px 24px;background:#1E3A5F"><p style="margin:0;color:#FFFFFF;font-family:Georgia,serif;font-size:20px;font-weight:700">WeightPilot</p><p style="margin:7px 0 0;color:#FFFFFFCC;font-size:12px;line-height:1.5">${escapeHtml(translated.footer)}</p></td></tr></table></td></tr></table></body></html>`,
    text: `${translated.greeting(input.memberName)}\n\n${translated.intro}\n\n${translated.heading}\n\n${reportContentToText(input.content)}\n\n${translated.disclaimerTitle}\n${translated.disclaimer}\n\n${translated.footer}`,
  };
}

export async function deliverGuidanceReport(input: {reportId: string; language: ReportLanguage; memberName: string; recipient: string; content: string}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return {ok: false as const, failureCode: "EMAIL_NOT_CONFIGURED"};
  const email = renderGuidanceReportEmail(input);
  try {
    const result = await new Resend(apiKey).emails.send({from, to: input.recipient, ...email}, {idempotencyKey: `weightpilot-report-${input.reportId}`});
    if (result.error || !result.data?.id) return {ok: false as const, failureCode: "PROVIDER_REJECTED"};
    return {ok: true as const, providerMessageId: result.data.id};
  } catch {
    return {ok: false as const, failureCode: "PROVIDER_UNAVAILABLE"};
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
