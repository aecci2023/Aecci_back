/**
 * Create an AECCI admin user.
 *
 * Usage:
 *   npx tsx scripts/create-admin.ts
 *
 * Override defaults via env vars:
 *   ADMIN_EMAIL=me@example.com ADMIN_PASSWORD=secret npx tsx scripts/create-admin.ts
 */

import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// ── Admin details — edit or override via env ──────────────────────────────────
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@aecci.org.in';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@2024#Secure';
const ADMIN_NAME     = process.env.ADMIN_NAME     || 'System Administrator';
const ADMIN_MOBILE   = process.env.ADMIN_MOBILE   || '+91 22 0000 0000';

async function main() {
  console.log('\n🔧  AECCI — Create Admin User\n');

  // Check for existing admin
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    if (existing.role === 'admin') {
      console.log(`⚠️  Admin already exists: ${ADMIN_EMAIL}`);
      console.log(`    Role     : ${existing.role}`);
      console.log(`    KYC      : ${existing.kycStatus}`);
      console.log('    No changes made.\n');
      return;
    }
    // Exists but not admin — promote
    const updated = await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { role: 'admin', kycStatus: 'active' },
    });
    console.log(`✅  Existing user promoted to admin: ${updated.email}\n`);
    return;
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const year  = new Date().getFullYear();
  const rand  = Math.floor(100000 + Math.random() * 900000);
  const appNo = `AECCI-${year}-${rand}`;

  const admin = await prisma.user.create({
    data: {
      email:             ADMIN_EMAIL,
      password:          hashedPassword,
      fullName:          ADMIN_NAME,
      mobileNumber:      ADMIN_MOBILE,
      role:              'admin',
      kycStatus:         'active',
      isEmailVerified:   true,
      applicationNumber: appNo,
      country:           'India',
      userType:          'Business',
      companyName:       "Asian Exporters' Chamber of Commerce and Industry",
      industrySector:    'Trade Facilitation',
      businessAddress:   'Navi Mumbai, Maharashtra, India',
      websiteUrl:        'https://aecci.org.in',
      // Plan — admins do not consume slots
      planActive:        false,
      slotsTotal:        0,
      slotsRemaining:    0,
    },
  });

  console.log('✅  Admin user created successfully!\n');
  console.log('─────────────────────────────────────────');
  console.log(`  ID                : ${admin.id}`);
  console.log(`  Name              : ${admin.fullName}`);
  console.log(`  Email             : ${admin.email}`);
  console.log(`  Password (plain)  : ${ADMIN_PASSWORD}`);
  console.log(`  Role              : ${admin.role}`);
  console.log(`  KYC Status        : ${admin.kycStatus}`);
  console.log(`  Application No.   : ${admin.applicationNumber}`);
  console.log('─────────────────────────────────────────');
  console.log('\n⚠️  Save the password above — it is not shown again.\n');
}

main()
  .catch((err) => {
    console.error('❌  Failed to create admin user:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
