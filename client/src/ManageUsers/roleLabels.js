const ROLE_LABELS = {
  FIELD: {
    sfpd: 'Officer',
  },
  CUSTODY: {
    sfso: "Sheriff's Deputy",
  },
  CARE: {
    connections: 'Care Staff',
  },
  ORG_ADMIN: 'Admin',
};

export function getRoleLabel (roles, organizationId) {
  if (roles.includes('ORG_ADMIN')) {
    return 'Admin';
  }
  for (const role of roles) {
    const mapping = ROLE_LABELS[role];
    if (typeof mapping === 'string') return mapping;
    if (mapping?.[organizationId]) return mapping[organizationId];
  }
  return roles[0] ?? '';
}
