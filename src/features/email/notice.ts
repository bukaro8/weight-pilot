const noticeCopy = {
  en: {
    notice: "This email is not monitored. Please do not reply.",
    link: "Send us a private message in WeightPilot",
  },
  es: {
    notice: "Este correo no se supervisa. Por favor, no respondas.",
    link: "Envíanos un mensaje privado en WeightPilot",
  },
} as const;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/gu, (character) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[character] ?? character);
}

export function renderNoReplyNotice(language: "en" | "es", messagesUrl?: string | null) {
  const copy = noticeCopy[language];
  let safeUrl: string | null = null;
  if (messagesUrl) {
    try {
      const parsed = new URL(messagesUrl);
      if (parsed.protocol === "https:" && !parsed.username && !parsed.password) safeUrl = parsed.toString();
    } catch { /* Omit invalid links. */ }
  }
  return {
    html: `<p style="margin:0 0 5px;color:#142A47;font-size:12px;font-weight:700;line-height:1.5">${escapeHtml(copy.notice)}</p>${safeUrl ? `<p style="margin:0;font-size:12px;line-height:1.5"><a href="${escapeHtml(safeUrl)}" style="color:#1E3A5F;text-decoration:underline">${escapeHtml(copy.link)}</a></p>` : ""}`,
    text: `${copy.notice}${safeUrl ? `\n${copy.link}: ${safeUrl}` : ""}`,
  };
}

/** Reply-To is optional and must be explicitly configured on the sender domain. */
export function configuredReplyTo(from: string | undefined, configured: string | undefined) {
  const address = configured?.trim();
  const sender = from?.match(/<([^<>]+)>/u)?.[1] ?? from?.trim();
  if (!address || !sender || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u.test(address)) return undefined;
  const senderDomain = sender.split("@")[1]?.toLowerCase();
  return senderDomain && address.split("@")[1]?.toLowerCase() === senderDomain ? address : undefined;
}
