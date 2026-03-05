import { PrismaClient } from '../src/generated/prisma';
import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Initialize Prisma with the database URL from .env.local
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

async function clearData(email: string) {
  console.log(`Searching for user with email: ${email}`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { business: true }
  });

  if (!user) {
    console.error(`User with email ${email} not found.`);
    return;
  }

  if (!user.businessId) {
    console.error(`User ${email} is not associated with any business.`);
    return;
  }

  const businessId = user.businessId;
  console.log(`Clearing all data for business: "${user.business?.name}" (ID: ${businessId})`);

  try {
    await prisma.$transaction([
      // Operational Data
      prisma.chatMessage.deleteMany({ where: { businessId } }),
      prisma.aiInsight.deleteMany({ where: { businessId } }),
      prisma.inventoryUsage.deleteMany({ where: { businessId } }),
      prisma.inventoryLot.deleteMany({ where: { businessId } }),
      prisma.ledgerEntry.deleteMany({ where: { businessId } }),

      // Order Related (Cascade might handle some, but being explicit is safer)
      prisma.orderStatusHistory.deleteMany({ where: { order: { businessId } } }),
      prisma.manufacturingStage.deleteMany({ where: { order: { businessId } } }),
      prisma.orderItem.deleteMany({ where: { order: { businessId } } }),
      prisma.order.deleteMany({ where: { businessId } }),

      // Product & Customer
      prisma.product.deleteMany({ where: { businessId } }),
      prisma.customer.deleteMany({ where: { businessId } }),
    ]);

    console.log('✅ Database operational data cleared successfully.');

    // Clear Redis cache for the dashboard
    const cacheKey = `dashboard:${businessId}`;
    try {
      await redis.del(cacheKey);
      console.log(`✅ Redis cache cleared for key: ${cacheKey}`);
    } catch (redisErr) {
      console.warn('⚠️ Could not clear Redis cache (check credentials):', redisErr);
    }

  } catch (error) {
    console.error('❌ Error clearing data:', error);
  }
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: npx tsx scripts/clear-user-data.ts <email>');
  process.exit(1);
}

clearData(email)
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
