import * as bcrypt from 'bcrypt';

import dataSource from '../data-source';
import { User } from '../../users/entities/user.entity';

// Creates the first ADMIN account, or promotes an existing user to ADMIN.
// Reads ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_FULL_NAME from .env.
// Usage: npm run seed:admin
async function createAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULL_NAME ?? 'Admin';

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
  }

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }

  await dataSource.initialize();

  try {
    const usersRepository = dataSource.getRepository(User);

    const existingUser = await usersRepository.findOne({
      where: { email },
    });

    // Promote an existing account instead of creating a duplicate
    if (existingUser) {
      existingUser.role = 'ADMIN';
      existingUser.isEmailVerified = true;
      await usersRepository.save(existingUser);

      console.log(`User ${email} is now an ADMIN`);
      return;
    }

    const admin = usersRepository.create({
      fullName,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'ADMIN',
      // Admin is created by the server owner, so no verification email is needed
      isEmailVerified: true,
    });

    await usersRepository.save(admin);

    console.log(`Admin ${email} created`);
  } finally {
    await dataSource.destroy();
  }
}

createAdmin().catch((error: Error) => {
  console.error(`Failed to create admin: ${error.message}`);
  process.exit(1);
});
