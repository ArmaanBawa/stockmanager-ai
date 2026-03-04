#!/usr/bin/env tsx
/**
 * Create Test User Script
 *
 * Creates a test user with a business and active paid subscription.
 *
 * Usage:
 *   npx tsx scripts/create-test-user.ts
 */

import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma';

const TEST_EMAIL = 'test@procureflow.com';
const TEST_PASSWORD = 'Test@1234';
const TEST_NAME = 'Test User';
const BUSINESS_NAME = 'Test Business';

async function createTestUser() {
  try {
    console.log('🚀 Creating test user...\n');

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
      include: { business: { include: { subscription: true } } },
    });

    if (existingUser) {
      console.log('⚠️  User already exists. Updating password and subscription...');

      // Update password
      const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 12);
      await prisma.user.update({
        where: { email: TEST_EMAIL },
        data: { hashedPassword },
      });

      // Ensure subscription is active
      if (existingUser.businessId) {
        await prisma.subscription.upsert({
          where: { businessId: existingUser.businessId },
          update: {
            status: 'active',
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
            cancelAtPeriodEnd: false,
          },
          create: {
            businessId: existingUser.businessId,
            status: 'active',
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            cancelAtPeriodEnd: false,
          },
        });
      }

      console.log('✅ User updated successfully!\n');
    } else {
      // Create business
      const business = await prisma.business.create({
        data: { name: BUSINESS_NAME },
      });
      console.log(`✅ Business created: ${business.name} (${business.id})`);

      // Hash password
      const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: TEST_EMAIL,
          name: TEST_NAME,
          hashedPassword,
          emailVerified: true,
          businessId: business.id,
        },
      });
      console.log(`✅ User created: ${user.name} (${user.id})`);

      // Create active subscription
      await prisma.subscription.create({
        data: {
          businessId: business.id,
          status: 'active',
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          cancelAtPeriodEnd: false,
        },
      });
      console.log('✅ Active subscription created (valid for 1 year)');
    }

    console.log('\n========================================');
    console.log('  TEST ACCOUNT CREDENTIALS');
    console.log('========================================');
    console.log(`  📧 Email:    ${TEST_EMAIL}`);
    console.log(`  🔑 Password: ${TEST_PASSWORD}`);
    console.log(`  💼 Business: ${BUSINESS_NAME}`);
    console.log(`  💳 Status:   PAID (Active)`);
    console.log('========================================\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();

