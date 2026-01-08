import User from '#models/user.js';

export default async function main (prisma) {
  console.log('Seeding users...');

  const users = [
    {
      email: 'admin@careconnectsf.org',
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true,
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
