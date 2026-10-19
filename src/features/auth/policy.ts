export type AccountRole = "USER" | "ADMIN";
export type AccountStatus = "ACTIVE" | "INACTIVE";

export type AccountSecurityState = {
  role: AccountRole;
  status: AccountStatus;
  emailVerified: boolean;
};

export const publicRegistrationEnabled = false;

export function canAccessPrivateServices(account: AccountSecurityState) {
  return account.status === "ACTIVE" && account.emailVerified;
}

export function canAccessAdmin(account: AccountSecurityState) {
  return canAccessPrivateServices(account) && account.role === "ADMIN";
}
