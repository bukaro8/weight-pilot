export function renderTreatmentRequestNotification(input: {language: "en" | "es"; target: "admin" | "member"; url: string}) {
  const spanish = input.language === "es";
  const subject = input.target === "admin" ? (spanish ? "Nueva solicitud en WeightPilot" : "New WeightPilot request") : (spanish ? "Actualización de tu solicitud" : "Your request has been updated");
  const body = input.target === "admin" ? (spanish ? "Hay una nueva solicitud para revisar." : "A new request is ready for review.") : (spanish ? "Hay una actualización de tu solicitud. Inicia sesión para verla." : "Your request has an update. Sign in to view it.");
  const safeUrl = input.url.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const html = `<div style="background:#FBF8F5;padding:32px;font-family:Arial,sans-serif;color:#1A2433"><div style="max-width:560px;margin:auto;background:#fff;padding:32px;border-radius:20px;border:1px solid #E6DFD9"><p style="font-weight:700;color:#1E3A5F">WeightPilot</p><h1 style="font-family:Georgia,serif;color:#142A47;font-size:26px">${subject}</h1><p>${body}</p><a href="${safeUrl}" style="display:inline-block;background:#1E3A5F;color:#fff;padding:14px 20px;border-radius:24px;text-decoration:none">${spanish ? "Ver solicitud" : "View request"}</a><p style="font-size:13px;color:#5B6779;margin-top:28px">WeightPilot · ${spanish ? "Información y orientación personalizadas" : "Personalised information and guidance"}</p></div></div>`;
  return {subject, html};
}
