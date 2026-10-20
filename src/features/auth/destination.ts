export function safePostLoginPath(value: string | null | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/consultations";
}

export function postLoginDestination(account: {role: "USER" | "ADMIN"}, requestedPath?: string | null) {
  return account.role === "ADMIN" ? "/admin" : safePostLoginPath(requestedPath);
}
