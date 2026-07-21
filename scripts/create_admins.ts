import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const admins = [
    {
      email: 'aecci2016@gmail.com',
      password: 'Global@ed26',
      fullName: 'Admin User 1'
    },
    {
      email: 'excellency007@yahoo.com',
      password: 'Excellency@26',
      fullName: 'Admin User 2'
    }
  ];

  for (const admin of admins) {
    const hashedPassword = await bcrypt.hash(admin.password, 10);
    
    // Check if exists
    const existing = await prisma.user.findUnique({
      where: { email: admin.email }
    });

    if (existing) {
      console.log(`Updating existing admin: ${admin.email}`);
      await prisma.user.update({
        where: { email: admin.email },
        data: {
          password: hashedPassword,
          role: 'admin',
          verificationStatus: 'active',
          isEmailVerified: true
        }
      });
    } else {
      console.log(`Creating new admin: ${admin.email}`);
      await prisma.user.create({
        data: {
          email: admin.email,
          password: hashedPassword,
          fullName: admin.fullName,
          role: 'admin',
          verificationStatus: 'active',
          isEmailVerified: true
        }
      });
    }
  }

  console.log('Admin accounts configured successfully.');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
