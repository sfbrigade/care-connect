import User from '#models/user.js';

export default async function main (prisma) {
  console.log('Seeding users...');

  const users = [
    {
      email: 'sfpd@careconnectsf.org',
      firstName: 'SFPD',
      lastName: 'User',
      isAdmin: false,
      organizationId: 'sfpd',
      roles: ['FIELD'],
      badgeNumber: '1234',
      mfaEnabled: false,
    },
    {
      email: 'sfpd2@careconnectsf.org',
      firstName: 'SFPD2',
      lastName: 'User',
      isAdmin: false,
      organizationId: 'sfpd',
      roles: ['FIELD'],
      badgeNumber: '4321',
      mfaEnabled: false,
    },
    {
      email: 'sfso@careconnectsf.org',
      firstName: 'SFSO',
      lastName: 'User',
      isAdmin: false,
      organizationId: 'sfso',
      roles: ['FIELD', 'CUSTODY', 'ORG_ADMIN'],
      badgeNumber: '5678',
      mfaEnabled: false,
    },
    {
      email: 'sfso-dual@careconnectsf.org',
      firstName: 'SFSO',
      lastName: 'Dual',
      isAdmin: false,
      organizationId: 'sfso',
      roles: ['FIELD', 'CUSTODY'],
      badgeNumber: '5679',
      mfaEnabled: false,
    },
    {
      email: 'care@careconnectsf.org',
      firstName: 'Care',
      lastName: 'User',
      isAdmin: false,
      organizationId: 'connections',
      roles: ['CARE', 'FACILITY_ADMIN'],
      mfaEnabled: false,
    },
  ];

  for (const user of users) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (existing) {
      console.log(`User ${user.email} already exists, skipping...`);
    } else {
      const u = new User(user);
      await u.setPassword('abcd1234');
      await prisma.user.create({ data: user });
      console.log(`Created user: ${user.email}`);
    }
  }

  console.log('Done seeding users!');
}
