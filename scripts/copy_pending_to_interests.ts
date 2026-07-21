import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching pending verifications...');
  const pendingUsers = await prisma.user.findMany({
    where: {
      OR: [
        { verificationStatus: 'pending' },
        { verificationStatus: 'pending_verification' }
      ]
    }
  });

  console.log(`Found ${pendingUsers.length} pending users.`);

  let createdCount = 0;
  for (const user of pendingUsers) {
    // Check if interest already exists
    const existingInterest = await prisma.interestSubmission.findFirst({
      where: { email: user.email }
    });

    if (existingInterest) {
      console.log(`Interest already exists for email: ${user.email}`);
      continue;
    }

    await prisma.interestSubmission.create({
      data: {
        category: 'Exporter',
        userType: user.userType || 'business',
        companyName: user.companyName,
        email: user.email,
        emailAddress: user.email,
        country: user.country,
        sector: user.industrySector,
        contactPerson: user.fullName,
        fullName: user.fullName,
        countryCode: user.countryCode,
        phoneWhatsapp: user.mobileNumber,
        yourCountry: user.country,
        objectives: [],
        products: user.products ? user.products.join(', ') : '',
        targetMarkets: user.targetMarkets || [],
        targetSourcingMarkets: [],
        status: 'pending',
      }
    });
    createdCount++;
    console.log(`Copied ${user.email} to interests.`);
  }

  console.log(`Finished. Created ${createdCount} new interest submissions.`);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
