export function getFirstName(fullName: string) {
  const normalized = fullName.trim().replace(/\s+/gu, " ");
  return normalized.split(" ")[0] || "";
}
