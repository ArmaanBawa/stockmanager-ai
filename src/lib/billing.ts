import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/helpers';
import { getMobileUser } from '@/lib/mobile-auth';
import { isSubscriptionActive } from '@/lib/subscription';

type BillingUser = {
    id: string;
    email: string;
    name: string;
    businessId: string;
    businessName: string;
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

export async function getSubscriptionForBusiness(businessId: string) {
    return prisma.subscription.findUnique({ where: { businessId } });
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
