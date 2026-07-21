import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating all interest forms to have category = "Exporter"...');
  const result = await prisma.interestSubmission.updateMany({
    data: {
      category: 'Exporter',
    },
  });
  console.log(`Updated ${result.count} interest forms.`);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
