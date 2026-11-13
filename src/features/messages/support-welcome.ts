import {createHash} from "node:crypto";

export function supportWelcomeMessage(language: "en" | "es") {
  return language === "es"
    ? "¡Gracias por contactar con WeightPilot!\n\nHemos recibido tu mensaje y te responderemos lo antes posible.\n\nBusca también una notificación de este mensaje en tu correo. Revisa tu bandeja de entrada y la carpeta de Spam o Correo no deseado. Si aparece allí, márcala como «No es spam» para facilitar que recibas nuestras próximas notificaciones."
    : "Thank you for contacting WeightPilot!\n\nWe've received your message and will reply as soon as possible.\n\nPlease look for an email notification about this reply. Check your inbox and your Spam or Junk Email folder. If you find it there, mark it as 'Not spam' or 'Not junk' to help future notifications reach your inbox.";
}

// A stable ID makes concurrent first-contact requests use the existing message
// idempotency constraint, including when a previous request committed but its
// response was lost. UUID version 8 is reserved for application-defined IDs.
export function supportWelcomeClientMessageId(conversationId: string) {
  const hash = createHash("sha256").update(`weightpilot:support-welcome:${conversationId}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-8${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
