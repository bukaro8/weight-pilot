import type {InvitationLanguage} from "../invitations/sharing";

const copy = {
  en: {
    subject: "You have a new private WeightPilot message",
    heading: "A new private message is waiting",
    body: "Sign in to your secure WeightPilot account to read and reply. This email does not contain the message itself.",
    button: "Open private messages",
    footer: "WeightPilot · Private weight-management information and guidance",
  },
  es: {
    subject: "Tienes un nuevo mensaje privado de WeightPilot",
    heading: "Tienes un nuevo mensaje privado",
    body: "Inicia sesión en tu cuenta segura de WeightPilot para leerlo y responder. Este correo no incluye el contenido del mensaje.",
    button: "Abrir mensajes privados",
    footer: "WeightPilot · Información y orientación privadas para el control de peso",
  },
} as const;

function escapeHtml(value: string) {
  return value.replace(/[&<>\'"]/g, (character) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"})[character] ?? character);
}

export function renderPrivateMessageNotification(input: {language: InvitationLanguage; url: string}) {
  const text = copy[input.language];
  const url = escapeHtml(input.url);
  return {
    subject: text.subject,
    html: `<!doctype html><html lang="${input.language}"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#FBF8F5;color:#1A2433;font-family:Inter,Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#FBF8F5"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#FFFFFF;border:1px solid #E6DFD9;border-radius:20px;overflow:hidden"><tr><td style="height:8px;background:#E9C9C0"></td></tr><tr><td style="padding:34px 28px"><p style="margin:0 0 26px;color:#1E3A5F;font-family:Georgia,serif;font-size:26px;font-weight:700">WeightPilot</p><h1 style="margin:0 0 14px;color:#142A47;font-family:Georgia,serif;font-size:28px;line-height:1.2">${escapeHtml(text.heading)}</h1><p style="margin:0 0 26px;color:#5B6779;font-size:15px;line-height:1.65">${escapeHtml(text.body)}</p><a href="${url}" style="display:inline-block;min-height:44px;padding:14px 23px;border-radius:999px;background:#1E3A5F;color:#FFFFFF;font-size:15px;font-weight:700;line-height:1.2;text-decoration:none">${escapeHtml(text.button)}</a></td></tr><tr><td style="padding:18px 28px;background:#F6ECE8;color:#5B6779;font-size:12px;line-height:1.5">${escapeHtml(text.footer)}</td></tr></table></td></tr></table></body></html>`,
    text: `${text.heading}\n\n${text.body}\n\n${text.button}: ${input.url}\n\n${text.footer}`,
  };
}
