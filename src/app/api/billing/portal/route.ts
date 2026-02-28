import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getBillingUser } from '@/lib/billing';

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
            { error: 'No active Razorpay subscription found' },
            { status: 400 }
        );
    }

    return NextResponse.json({
        url: `https://dashboard.razorpay.com/app/subscriptions/${subscription.razorpaySubscriptionId}`,
    });
}
