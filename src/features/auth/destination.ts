const memberProtectedRoots = ["/dashboard", "/consultations", "/reports", "/messages", "/invitations"] as const;
const internalOrigin = "https://weightpilot.invalid";

export function safePostLoginPath(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/u.test(value)) return "/dashboard";

  try {
    const destination = new URL(value, internalOrigin);
    if (destination.origin !== internalOrigin) return "/dashboard";
    const isMemberRoute = memberProtectedRoots.some((root) => destination.pathname === root || destination.pathname.startsWith(`${root}/`));
    if (!isMemberRoute) return "/dashboard";
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/dashboard";
  }
}

export function postLoginDestination(account: {role: "USER" | "ADMIN"}, requestedPath?: string | null) {
  if (account.role === "ADMIN") return "/admin";
  const destination = safePostLoginPath(requestedPath);
  return destination === "/admin" || destination.startsWith("/admin/") ? "/dashboard" : destination;
}
