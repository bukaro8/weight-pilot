export type InvitationLanguage = "en" | "es";

export function publicInvitationOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password ||
      ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)) return null;
    return url.origin;
  } catch { return null; }
}

export function invitationRegistrationLink(origin: string, language: InvitationLanguage, code: string) {
  const url = new URL(`/${language}/register`, origin);
  url.searchParams.set("code", code);
  return url.toString();
}

export function invitationShareMessage(language: InvitationLanguage, link: string, kind: "STANDARD" | "MASTER" = "STANDARD") {
  if (kind === "MASTER") return language === "es"
    ? `Te invito a conocer WeightPilot, un espacio privado de información y orientación personalizada para el control de peso. Puedes crear tu cuenta con este enlace: ${link}\n\nEste enlace no caduca y puede compartirse con varias personas. Cada persona debe crear su propia cuenta.`
    : `I'd like to invite you to WeightPilot, a private space for personalised weight-management information and guidance. You can create your account with this link: ${link}\n\nThis link does not expire and can be shared with several people. Each person must create their own account.`;
  return language === "es"
    ? `Te invito a conocer WeightPilot, un espacio privado de información y orientación personalizada para el control de peso. Puedes crear tu cuenta con esta invitación: ${link}\n\nEl enlace es de un solo uso y caduca a los 7 días de su creación.`
    : `I'd like to invite you to WeightPilot, a private space for personalised weight-management information and guidance. You can create your account with this invitation: ${link}\n\nThe link can be used once and expires 7 days after it was created.`;
}

export function whatsappInvitationUrl(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function smsInvitationUrl(message: string) {
  return `sms:?body=${encodeURIComponent(message)}`;
}
