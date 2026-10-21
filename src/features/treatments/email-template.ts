export function renderTreatmentRequestNotification(input: {language: "en" | "es"; target: "admin" | "member"; url: string}) {
  const spanish = input.language === "es";
  const subject = input.target === "admin" ? (spanish ? "Nueva solicitud en WeightPilot" : "New WeightPilot request") : (spanish ? "Actualización de tu solicitud" : "Your request has been updated");
  const body = input.target === "admin" ? (spanish ? "Hay una nueva solicitud para revisar." : "A new request is ready for review.") : (spanish ? "Hay una actualización de tu solicitud. Inicia sesión para verla." : "Your request has an update. Sign in to view it.");
  const safeUrl = input.url.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const html = `<div style="background:#FBF8F5;padding:32px;font-family:Arial,sans-serif;color:#1A2433"><div style="max-width:560px;margin:auto;background:#fff;padding:32px;border-radius:20px;border:1px solid #E6DFD9"><p style="font-weight:700;color:#1E3A5F">WeightPilot</p><h1 style="font-family:Georgia,serif;color:#142A47;font-size:26px">${subject}</h1><p>${body}</p><a href="${safeUrl}" style="display:inline-block;background:#1E3A5F;color:#fff;padding:14px 20px;border-radius:24px;text-decoration:none">${spanish ? "Ver solicitud" : "View request"}</a><p style="font-size:13px;color:#5B6779;margin-top:28px">WeightPilot · ${spanish ? "Información y orientación personalizadas" : "Personalised information and guidance"}</p></div></div>`;
  return {subject, html};
}

const decisionCopy = {
  en: {
    subject: "Your WeightPilot request: next steps",
    title: "Your request has been approved for next steps",
    greeting: (name: string) => `Hello ${name},`,
    intro: "The administrator has reviewed your request. The details below are for the next administrative steps only.",
    selected: "Product and strength selected for next steps",
    payment: "Bank transfer details",
    account: "Account name", sort: "Sort code", number: "Account number",
    cash: "You may also choose to pay in cash. Please contact us through your private WeightPilot messages to arrange next steps.",
    button: "Open private messages",
    disclaimer: "This message is not a prescription or a determination of medical suitability. Any medicine requires independent assessment, prescribing and supply by an appropriately authorised professional.",
    footer: "WeightPilot · Private weight-management information and guidance",
  },
  es: {
    subject: "Tu solicitud de WeightPilot: próximos pasos",
    title: "Tu solicitud se ha aprobado para los próximos pasos",
    greeting: (name: string) => `Hola ${name},`,
    intro: "La administración ha revisado tu solicitud. Los datos siguientes son únicamente para los próximos pasos administrativos.",
    selected: "Producto y concentración seleccionados para los próximos pasos",
    payment: "Datos para transferencia bancaria",
    account: "Titular de la cuenta", sort: "Código de clasificación", number: "Número de cuenta",
    cash: "También puedes elegir pagar en efectivo. Escríbenos mediante tus mensajes privados de WeightPilot para organizar los próximos pasos.",
    button: "Abrir mensajes privados",
    disclaimer: "Este mensaje no es una receta ni determina la idoneidad médica. Cualquier medicamento requiere una evaluación, prescripción y suministro independientes por parte de un profesional debidamente autorizado.",
    footer: "WeightPilot · Información y orientación privadas para el control de peso",
  },
} as const;

function escape(value: string) {
  return value.replace(/[&<>\"']/g, (character) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[character] ?? character);
}

export function renderTreatmentApprovalEmail(input: {
  language: "en" | "es";
  memberName: string;
  treatment: "SEMAGLUTIDE" | "TIRZEPATIDE";
  strength: string;
  messagesUrl: string;
  accountName?: string;
  sortCode?: string;
  accountNumber?: string;
}) {
  const copy = decisionCopy[input.language];
  const treatment = input.language === "es"
    ? (input.treatment === "SEMAGLUTIDE" ? "Semaglutida" : "Tirzepatida")
    : (input.treatment === "SEMAGLUTIDE" ? "Semaglutide" : "Tirzepatide");
  const accountName = input.accountName?.trim() || "XXXX";
  const sortCode = input.sortCode?.trim() || "00 00 00";
  const accountNumber = input.accountNumber?.trim() || "0000000";
  const safeUrl = escape(input.messagesUrl);
  const subject = copy.subject;
  const html = `<!doctype html><html lang="${input.language}"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#FBF8F5;color:#1A2433;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FBF8F5"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E6DFD9;border-radius:20px;overflow:hidden"><tr><td style="padding:30px 24px"><p style="margin:0 0 26px;color:#1E3A5F;font-family:Georgia,serif;font-size:26px;font-weight:bold">WeightPilot</p><p>${escape(copy.greeting(input.memberName))}</p><h1 style="color:#142A47;font-family:Georgia,serif;font-size:28px;line-height:1.2">${escape(copy.title)}</h1><p style="color:#5B6779;line-height:1.6">${escape(copy.intro)}</p><section style="margin:22px 0;padding:18px;background:#EDF1F6;border-radius:14px"><p style="margin:0;color:#5B6779;font-size:13px">${escape(copy.selected)}</p><p style="margin:8px 0 0;color:#142A47;font-size:18px;font-weight:bold">${escape(treatment)} · ${escape(input.strength)}</p></section><section style="margin:22px 0;padding:18px;background:#F6ECE8;border:1px solid #E9C9C0;border-radius:14px"><h2 style="margin:0 0 12px;color:#142A47;font-family:Georgia,serif;font-size:20px">${escape(copy.payment)}</h2><p style="margin:5px 0"><strong>${escape(copy.account)}:</strong> ${escape(accountName)}</p><p style="margin:5px 0"><strong>${escape(copy.sort)}:</strong> ${escape(sortCode)}</p><p style="margin:5px 0"><strong>${escape(copy.number)}:</strong> ${escape(accountNumber)}</p><p style="margin:14px 0 0;color:#5B6779;line-height:1.55">${escape(copy.cash)}</p></section><p style="font-size:13px;line-height:1.6;color:#5B6779">${escape(copy.disclaimer)}</p><a href="${safeUrl}" style="display:inline-block;margin-top:12px;padding:14px 20px;border-radius:999px;background:#1E3A5F;color:#fff;font-weight:bold;text-decoration:none">${escape(copy.button)}</a></td></tr><tr><td style="padding:20px 24px;background:#1E3A5F;color:#fff;font-size:12px">${escape(copy.footer)}</td></tr></table></td></tr></table></body></html>`;
  const text = `${copy.greeting(input.memberName)}\n\n${copy.title}\n${copy.intro}\n\n${copy.selected}: ${treatment} · ${input.strength}\n\n${copy.payment}\n${copy.account}: ${accountName}\n${copy.sort}: ${sortCode}\n${copy.number}: ${accountNumber}\n\n${copy.cash}\n\n${copy.disclaimer}\n\n${copy.button}: ${input.messagesUrl}\n\n${copy.footer}`;
  return {subject, html, text};
}
