/**
 * Script: Import existing collaboration partners from old database JSON
 * 
 * Logic:
 * - Reads aecci_database.clients.json (collaborators)
 * - For each collaborator:
 *   - Generate password: first 4 letters of email (before @) + @123
 *   - If user with that email exists → update their role to 'partner', set password, update data
 *   - If user doesn't exist → create new user + partner profile
 * 
 * Run: npx ts-node scripts/import-collaboration-partners.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface OldClient {
  email: string;
  companyName: string;
  firstName: string;
  surName: string;
  country: string;
  city: string;
  state: string;
  businessCategory: string;
  role: string;
  phoneNo: number | { $numberLong: string };
  telephoneNo: string;
  address1: string;
  address2: string;
  memberShipNo?: string;
  validUpTo?: string;
  isAvailable?: boolean;
}

function generatePassword(email: string): string {
  const localPart = email.split('@')[0];
  const letters = localPart.replace(/[^a-zA-Z]/g, '').substring(0, 4).toLowerCase();
  return `${letters}@123`;
}

function getPhoneNumber(phoneNo: number | { $numberLong: string }): string {
  if (typeof phoneNo === 'object' && phoneNo.$numberLong) {
    return phoneNo.$numberLong;
  }
  return String(phoneNo);
}

async function main() {
  const jsonPath = path.resolve(__dirname, '../../aecci_database.clients.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ File not found:', jsonPath);
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const clients: OldClient[] = JSON.parse(rawData);

  console.log(`\n📋 Found ${clients.length} collaboration partners to import\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const client of clients) {
    try {
      const email = client.email.trim().toLowerCase();
      const rawPassword = generatePassword(email);
      const hashedPassword = await bcrypt.hash(rawPassword, 10);
      const fullName = `${client.firstName} ${client.surName}`.trim();
      const phone = getPhoneNumber(client.phoneNo);

      // Check if user exists
      const existingUser = await prisma.user.findUnique({ where: { email } });

      if (existingUser) {
        // Update existing user
        await prisma.user.update({
          where: { email },
          data: {
            password: hashedPassword,
            role: 'partner',
            verificationStatus: 'active',
            isEmailVerified: true,
            fullName: fullName || existingUser.fullName,
            companyName: client.companyName || existingUser.companyName,
            country: client.country || existingUser.country,
            mobileNumber: phone || existingUser.mobileNumber,
            professionalTitle: client.role || existingUser.professionalTitle,
          },
        });

        // Ensure partner profile exists
        const existingProfile = await prisma.partnerProfile.findUnique({ where: { userId: existingUser.id } });
        if (!existingProfile) {
          await prisma.partnerProfile.create({
            data: {
              userId: existingUser.id,
              organization: client.companyName || '',
              expertiseCountries: client.country ? [client.country] : [],
              expertiseSectors: client.businessCategory ? [client.businessCategory] : [],
              status: 'approved',
              tier: 'Standard',
            },
          });
        } else {
          await prisma.partnerProfile.update({
            where: { userId: existingUser.id },
            data: {
              organization: client.companyName || existingProfile.organization,
              expertiseCountries: client.country && !existingProfile.expertiseCountries.includes(client.country)
                ? [...existingProfile.expertiseCountries, client.country]
                : existingProfile.expertiseCountries,
              expertiseSectors: client.businessCategory && !existingProfile.expertiseSectors.includes(client.businessCategory)
                ? [...existingProfile.expertiseSectors, client.businessCategory]
                : existingProfile.expertiseSectors,
              status: 'approved',
            },
          });
        }

        updated++;
        console.log(`✏️  Updated: ${email} (${fullName}) — pass: ${rawPassword}`);
      } else {
        // Create new user
        const newUser = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            fullName,
            companyName: client.companyName || null,
            country: client.country || null,
            mobileNumber: phone || null,
            professionalTitle: client.role || null,
            isEmailVerified: true,
            role: 'partner',
            verificationStatus: 'active',
            userType: 'Individual',
            applicationNumber: client.memberShipNo || `AECCI-PARTNER-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
          },
        });

        // Create partner profile
        await prisma.partnerProfile.create({
          data: {
            userId: newUser.id,
            organization: client.companyName || '',
            expertiseCountries: client.country ? [client.country] : [],
            expertiseSectors: client.businessCategory ? [client.businessCategory] : [],
            status: 'approved',
            tier: 'Standard',
          },
        });

        created++;
        console.log(`✅ Created: ${email} (${fullName}) — pass: ${rawPassword}`);
      }
    } catch (err: any) {
      errors++;
      console.error(`❌ Error for ${client.email}: ${err.message}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`📊 Import Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors:  ${errors}`);
  console.log(`   Total:   ${clients.length}`);
  console.log(`========================================\n`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  prisma.$disconnect();
  process.exit(1);
});
