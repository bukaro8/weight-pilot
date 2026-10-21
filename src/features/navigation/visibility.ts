export type HeaderRole = "USER" | "ADMIN" | undefined;

export function headerNavigationKind(isPending: boolean, role: HeaderRole) {
  if (isPending || !role) return "public" as const;
  return role === "ADMIN" ? "admin" as const : "member" as const;
}
