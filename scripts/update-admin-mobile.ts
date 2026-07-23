import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const updates = [
    { email: 'admin@aecci.org.in', mobileNumber: '7057332679' },
    { email: 'ed@aecci.org.in', mobileNumber: '966355575' },
    { email: 'excellency007@yahoo.com', mobileNumber: '9920200996' }
  ];

  console.log("Updating admin mobile numbers...");

  for (const update of updates) {
    const user = await prisma.user.findUnique({ where: { email: update.email } });
    if (user) {
      await prisma.user.update({
        where: { email: update.email },
        data: { mobileNumber: update.mobileNumber }
      });
      console.log(`✅ Updated mobile number for ${update.email} to ${update.mobileNumber}`);
    } else {
      console.log(`❌ User ${update.email} not found.`);
    }
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
