import { NextRequest, NextResponse } from 'next/server';
import { getBillingUser, getSubscriptionForBusiness } from '@/lib/billing';
import { isSubscriptionActive } from '@/lib/subscription';

export async function GET(req: NextRequest) {
    const user = await getBillingUser(req);
    if (!user?.businessId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await getSubscriptionForBusiness(user.businessId);

    return NextResponse.json({
        active: isSubscriptionActive(subscription),
        status: subscription?.status || 'inactive',
        currentPeriodEnd: subscription?.currentPeriodEnd || null,
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
    });
}
