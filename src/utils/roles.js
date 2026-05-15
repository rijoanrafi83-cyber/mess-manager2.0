export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  MEMBER: "member",
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: "Administrator",
  [ROLES.MANAGER]: "Manager",
  [ROLES.MEMBER]: "Member",
};

export const PERMISSIONS = {
  VIEW_DASHBOARD: "view_dashboard",
  VIEW_MEMBERS: "view_members",
  MANAGE_USERS: "manage_users",
  VIEW_MEALS: "view_meals",
  MANAGE_MEALS: "manage_meals",
  MANAGE_BAZAAR: "manage_bazaar",
  VIEW_DEPOSITS: "view_deposits",
  MANAGE_DEPOSITS: "manage_deposits",
  VIEW_REPORTS: "view_reports",
  MANAGE_SETTINGS: "manage_settings",
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.MANAGER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_MEMBERS,
    PERMISSIONS.VIEW_MEALS,
    PERMISSIONS.MANAGE_MEALS,
    PERMISSIONS.MANAGE_BAZAAR,
    PERMISSIONS.VIEW_DEPOSITS,
    PERMISSIONS.MANAGE_DEPOSITS,
    PERMISSIONS.VIEW_REPORTS,
  ],
  [ROLES.MEMBER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_MEALS,
    PERMISSIONS.VIEW_DEPOSITS,
    PERMISSIONS.VIEW_REPORTS,
  ],
};

export function hasPermission(role, permission) {
  return Boolean(
    role &&
      ROLE_PERMISSIONS[role]?.includes(permission)
  );
}

export function isManagementRole(role) {
  return role === ROLES.ADMIN || role === ROLES.MANAGER;
}

export function normalizeCredentialAlias(value) {
  return String(value || "").trim().toLowerCase();
}

export function credentialAliasDocId(value) {
  return encodeURIComponent(normalizeCredentialAlias(value));
}
