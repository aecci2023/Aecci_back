import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@gmail.com';
  const password = 'admin@123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const existingAdmin = await prisma.user.findUnique({ where: { email } });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName: 'System Administrator',
        role: 'admin',
        isEmailVerified: true,
      },
    });
    console.log('Admin account created: admin@gmail.com / admin@123');
  } else {
    // Optionally update password if you want it to always be reset
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword, role: 'admin' },
    });
    console.log('Admin account already exists. Password and role updated.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
