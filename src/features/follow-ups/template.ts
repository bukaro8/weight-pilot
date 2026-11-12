import {renderNoReplyNotice} from "@/features/email/notice";
import type {FollowUpCategory} from "./types";

const copy = {
  en: {
    incomplete: {
      subject: "Your WeightPilot assessment is waiting for you",
      message: (firstName: string) => `Hi ${firstName}! 👋\n\nJust a friendly reminder that your WeightPilot assessment isn't finished yet.\n\nYour progress has been saved, so you can continue whenever you're ready.\n\nIf you need help, send us a private message in WeightPilot.\n\nThe WeightPilot Team`,
      button: "Continue your assessment",
    },
    treatment: {
      subject: "Just checking in — WeightPilot",
      message: (firstName: string) => `Hi ${firstName}! 👋\n\nWe wanted to check how you're getting on.\n\nIf you have questions about your next steps, or would simply like a friendly chat, you can reach us through your private WeightPilot messages.\n\nThe WeightPilot Team`,
      button: "Open private messages",
    },
  },
  es: {
    incomplete: {
      subject: "Tu evaluación de WeightPilot te está esperando",
      message: (firstName: string) => `¡Hola, ${firstName}! 👋\n\nSolo queríamos recordarte que todavía tienes pendiente terminar tu evaluación en WeightPilot.\n\nTus respuestas están guardadas, así que puedes continuar cuando quieras.\n\nSi necesitas ayuda, escríbenos mediante los mensajes privados de WeightPilot.\n\nEl equipo de WeightPilot`,
      button: "Continúa tu evaluación",
    },
    treatment: {
      subject: "¿Cómo te va? — WeightPilot",
      message: (firstName: string) => `¡Hola, ${firstName}! 👋\n\nQueríamos saber cómo te está yendo.\n\nSi tienes alguna pregunta sobre los siguientes pasos o simplemente quieres conversar, escríbenos desde los mensajes privados de WeightPilot.\n\nEl equipo de WeightPilot`,
      button: "Abrir mensajes privados",
    },
  },
} as const;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/gu, (character) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[character] ?? character);
}

export function defaultFollowUpText(category: FollowUpCategory, language: "en" | "es", firstName: string) {
  const selected = category === "INCOMPLETE_ASSESSMENT" ? copy[language].incomplete : copy[language].treatment;
  return {subject: selected.subject, message: selected.message(firstName)};
}

export function renderFollowUpEmail(input: {
  category: FollowUpCategory;
  language: "en" | "es";
  subject: string;
  message: string;
  actionUrl: string;
  messagesUrl: string;
}) {
  const button = input.category === "INCOMPLETE_ASSESSMENT" ? copy[input.language].incomplete.button : copy[input.language].treatment.button;
  const notice = renderNoReplyNotice(input.language, input.messagesUrl);
  const safeAction = escapeHtml(input.actionUrl);
  const paragraphs = input.message.trim().split(/\n{2,}/u).map((part) => `<p style="margin:0 0 18px;color:#1A2433;font-size:15px;line-height:1.7">${escapeHtml(part).replaceAll("\n", "<br>")}</p>`).join("");
  return {
    subject: input.subject,
    html: `<!doctype html><html lang="${input.language}"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#FBF8F5;color:#1A2433;font-family:Inter,Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FBF8F5"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E6DFD9;border-radius:18px;overflow:hidden"><tr><td style="height:8px;background:#E9C9C0"></td></tr><tr><td style="padding:32px 24px"><p style="margin:0 0 28px;color:#1E3A5F;font-family:Georgia,serif;font-size:27px;font-weight:700">WeightPilot</p>${paragraphs}<a href="${safeAction}" style="display:inline-block;padding:14px 23px;border-radius:999px;background:#1E3A5F;color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none">${escapeHtml(button)}</a></td></tr><tr><td style="padding:20px 24px;background:#F6ECE8">${notice.html}</td></tr></table></td></tr></table></body></html>`,
    text: `${input.message.trim()}\n\n${button}: ${input.actionUrl}\n\n${notice.text}`,
  };
}
