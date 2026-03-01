import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getRazorpay } from '@/lib/razorpay';
import { getBillingUser } from '@/lib/billing';

/**
 * Cancel the user's Razorpay subscription.
 * Sets cancel_at_cycle_end so the user keeps access until the current period ends.
 */
export async function POST(req: NextRequest) {
    const user = await getBillingUser(req);
    if (!user?.businessId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
        where: { businessId: user.businessId },
    });

    if (!subscription?.razorpaySubscriptionId) {
        return NextResponse.json(
            { error: 'No active subscription found' },
            { status: 400 }
        );
    }

    try {
        // Cancel at the end of current billing cycle (user keeps access until then)
        await getRazorpay().subscriptions.cancel(subscription.razorpaySubscriptionId, false);

        // Update our DB
        await prisma.subscription.update({
            where: { businessId: user.businessId },
            data: {
                cancelAtPeriodEnd: true,
            },
        });

        return NextResponse.json({ success: true, message: 'Subscription will be cancelled at the end of the current billing period.' });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Failed to cancel subscription:', msg);
        return NextResponse.json({ error: 'Failed to cancel subscription', detail: msg }, { status: 500 });
    }
}

