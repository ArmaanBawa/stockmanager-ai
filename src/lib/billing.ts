import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import { getSessionUser } from '@/lib/helpers';
import { getMobileUser } from '@/lib/mobile-auth';
import { isSubscriptionActive } from '@/lib/subscription';

type BillingUser = {
    id: string;
    email: string;
    name: string;
    businessId: string;
    businessName: string;
    role: string;
};

export async function getBillingUser(req?: NextRequest): Promise<BillingUser | null> {
    const sessionUser = await getSessionUser();
    if (sessionUser?.businessId) return sessionUser as BillingUser;

    if (req) {
        const mobileUser = await getMobileUser(req);
        if (mobileUser?.businessId) return mobileUser as BillingUser;
    }

    return null;
}

const SUB_CACHE_TTL = 60; // seconds

export async function getSubscriptionForBusiness(businessId: string) {
    const cacheKey = `sub:${businessId}`;

    // Try Redis cache first
    try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            return typeof cached === 'string' ? JSON.parse(cached) : cached;
        }
    } catch {
        // Redis unavailable — fall through to DB
    }

    const sub = await prisma.subscription.findUnique({ where: { businessId } });

    // Cache the result for subsequent requests
    if (sub) {
        try {
            await redis.set(cacheKey, JSON.stringify(sub), { ex: SUB_CACHE_TTL });
        } catch {
            // Redis unavailable — ignore
        }
    }

    return sub;
}

export async function requireActiveSubscription(req: NextRequest) {
    const user = await getBillingUser(req);

    if (!user?.businessId) {
        return {
            ok: false as const,
            response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        };
    }

    const subscription = await getSubscriptionForBusiness(user.businessId);
    if (!isSubscriptionActive(subscription)) {
        return {
            ok: false as const,
            response: NextResponse.json({ error: 'Subscription required' }, { status: 402 }),
        };
    }

    return { ok: true as const, user, subscription };
}
