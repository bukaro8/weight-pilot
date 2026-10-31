import type {InvitationLanguage} from "./sharing";

const copy = {
  en: {subject: "Your invitation to WeightPilot", heading: "A thoughtful next step, at your pace", button: "Create your account", expiry: "This invitation can be used once and expires 7 days after it was created.", master: "This invitation does not expire and may be used by several people. Please create your own account.", fallback: "If the button does not work, copy this link into your browser:", footer: "WeightPilot · Private, personalised weight-management information and guidance"},
  es: {subject: "Tu invitación a WeightPilot", heading: "Un próximo paso a tu ritmo", button: "Crear tu cuenta", expiry: "Esta invitación es de un solo uso y caduca a los 7 días de su creación.", master: "Esta invitación no caduca y puede utilizarse por varias personas. Crea tu propia cuenta.", fallback: "Si el botón no funciona, copia este enlace en tu navegador:", footer: "WeightPilot · Información y orientación privadas y personalizadas para el control de peso"},
} as const;

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/gu, (character) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"})[character] ?? character);
}

export function renderInvitationEmail(language: InvitationLanguage, link: string, shareMessage: string, kind: "STANDARD" | "MASTER" = "STANDARD") {
  const t = copy[language];
  const safeLink = escapeHtml(link);
  const message = shareMessage.split("\n\n")[0];
  return {
    subject: t.subject,
    html: `<!doctype html><html lang="${language}"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#FBF8F5;color:#1A2433;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FBF8F5"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E6DFD9;border-radius:18px;overflow:hidden"><tr><td style="height:8px;background:#E9C9C0"></td></tr><tr><td style="padding:32px 24px"><p style="margin:0 0 28px;color:#1E3A5F;font-family:Georgia,serif;font-size:27px;font-weight:700">WeightPilot</p><h1 style="margin:0 0 16px;color:#142A47;font-family:Georgia,serif;font-size:29px;line-height:1.2">${escapeHtml(t.heading)}</h1><p style="margin:0 0 22px;color:#5B6779;font-size:16px;line-height:1.65">${escapeHtml(message)}</p><a href="${safeLink}" style="display:inline-block;padding:14px 24px;border-radius:999px;background:#1E3A5F;color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none">${escapeHtml(t.button)}</a><p style="margin:25px 0 10px;color:#5B6779;font-size:13px;line-height:1.6">${escapeHtml(kind === "MASTER" ? t.master : t.expiry)}</p><p style="margin:0;color:#5B6779;font-size:12px;line-height:1.6">${escapeHtml(t.fallback)}<br><a href="${safeLink}" style="color:#1E3A5F;word-break:break-all">${safeLink}</a></p></td></tr><tr><td style="padding:18px 24px;background:#1E3A5F;color:#FFFFFF;font-size:12px;line-height:1.5">${escapeHtml(t.footer)}</td></tr></table></td></tr></table></body></html>`,
    text: `${t.heading}\n\n${shareMessage}\n\n${t.button}: ${link}\n\n${t.footer}`,
  };
}
