import "server-only";

import {eq} from "drizzle-orm";
import {Resend} from "resend";

import {getDb} from "@/db";
import {user} from "@/db/schema";

type AuthenticationEmail = {userId: string; email: string; name: string; url: string};
type Language = "en" | "es";

const copy = {
  en: {
    verificationSubject: "Verify your WeightPilot email",
    verificationHeading: "Confirm your email address",
    verificationBody: "Confirm your email to finish securing your WeightPilot account.",
    verificationButton: "Verify email",
    resetSubject: "Reset your WeightPilot password",
    resetHeading: "Reset your password",
    resetBody: "We received a request to reset your WeightPilot password. This link expires in one hour.",
    resetButton: "Reset password",
    greeting: (name: string) => `Hello ${name},`,
    ignore: "If you did not request this, you can safely ignore this email.",
    linkHelp: "If the button does not work, copy and paste this link into your browser:",
  },
  es: {
    verificationSubject: "Verifica tu correo de WeightPilot",
    verificationHeading: "Confirma tu dirección de correo",
    verificationBody: "Confirma tu correo para terminar de proteger tu cuenta de WeightPilot.",
    verificationButton: "Verificar correo",
    resetSubject: "Restablece tu contraseña de WeightPilot",
    resetHeading: "Restablece tu contraseña",
    resetBody: "Hemos recibido una solicitud para restablecer tu contraseña de WeightPilot. Este enlace caduca en una hora.",
    resetButton: "Restablecer contraseña",
    greeting: (name: string) => `Hola ${name},`,
    ignore: "Si no has solicitado este cambio, puedes ignorar este correo.",
    linkHelp: "Si el botón no funciona, copia y pega este enlace en tu navegador:",
  },
} as const;

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);
}

async function getPreferredLanguage(userId: string): Promise<Language> {
  try {
    const [record] = await getDb().select({preferredLanguage: user.preferredLanguage})
      .from(user).where(eq(user.id, userId)).limit(1);
    return record?.preferredLanguage === "es" ? "es" : "en";
  } catch {
    return "en";
  }
}

function renderEmail(options: {language: Language; name: string; heading: string; body: string; button: string; url: string}) {
  const translated = copy[options.language];
  const safeUrl = escapeHtml(options.url);
  return {
    html: `<!doctype html><html lang="${options.language}"><body style="margin:0;background:#FBF8F5;color:#1A2433;font-family:Inter,Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#FBF8F5"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E6DFD9;border-radius:20px;overflow:hidden"><tr><td style="height:8px;background:#E9C9C0"></td></tr><tr><td style="padding:36px 32px"><p style="margin:0 0 28px;color:#1E3A5F;font-family:Georgia,serif;font-size:25px;font-weight:700">WeightPilot</p><p style="margin:0 0 12px;font-size:16px">${escapeHtml(translated.greeting(options.name))}</p><h1 style="margin:0 0 16px;color:#142A47;font-family:Georgia,serif;font-size:30px;line-height:1.2">${escapeHtml(options.heading)}</h1><p style="margin:0 0 26px;color:#5B6779;font-size:16px;line-height:1.65">${escapeHtml(options.body)}</p><a href="${safeUrl}" style="display:inline-block;padding:14px 24px;border-radius:999px;background:#1E3A5F;color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none">${escapeHtml(options.button)}</a><p style="margin:28px 0 8px;color:#5B6779;font-size:14px;line-height:1.55">${escapeHtml(translated.ignore)}</p><p style="margin:0;color:#5B6779;font-size:12px;line-height:1.5">${escapeHtml(translated.linkHelp)}<br><a href="${safeUrl}" style="color:#1E3A5F;word-break:break-all">${safeUrl}</a></p></td></tr></table></td></tr></table></body></html>`,
    text: `${translated.greeting(options.name)}\n\n${options.heading}\n\n${options.body}\n\n${options.button}: ${options.url}\n\n${translated.ignore}`,
  };
}

async function sendAuthenticationEmail(message: AuthenticationEmail, kind: "verification" | "reset") {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return;

  const language = await getPreferredLanguage(message.userId);
  const translated = copy[language];
  const isVerification = kind === "verification";
  const email = renderEmail({
    language,
    name: message.name,
    heading: isVerification ? translated.verificationHeading : translated.resetHeading,
    body: isVerification ? translated.verificationBody : translated.resetBody,
    button: isVerification ? translated.verificationButton : translated.resetButton,
    url: message.url,
  });

  try {
    await new Resend(apiKey).emails.send({
      from, to: message.email,
      subject: isVerification ? translated.verificationSubject : translated.resetSubject,
      ...email,
    });
  } catch (error) {
    // Do not let delivery state disclose whether an account exists.
    console.error("Authentication email delivery failed", error instanceof Error ? error.message : "Unknown error");
  }
}

export async function sendVerificationEmail(message: AuthenticationEmail) {
  await sendAuthenticationEmail(message, "verification");
}

export async function sendPasswordResetEmail(message: AuthenticationEmail) {
  await sendAuthenticationEmail(message, "reset");
}
