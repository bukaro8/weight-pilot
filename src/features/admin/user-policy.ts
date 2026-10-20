export function userMutationGuard(actorId: string, target: {id: string; role: "USER" | "ADMIN"} | undefined) {
  if (target?.id === actorId) return "SELF_PROTECTED" as const;
  if (target?.role === "ADMIN") return "ADMIN_PROTECTED" as const;
  if (!target) return "NOT_FOUND" as const;
  return "ALLOWED" as const;
}
