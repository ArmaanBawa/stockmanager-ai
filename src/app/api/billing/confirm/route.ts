import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getRazorpay } from '@/lib/razorpay';
import { getBillingUser } from '@/lib/billing';

/**
 * Called by the frontend right after Razorpay payment succeeds.
 * Fetches the subscription from Razorpay to verify it's active,
 * then immediately updates the DB — no need to wait for the webhook.
 */
export async function POST(req: NextRequest) {
    const user = await getBillingUser(req);
    if (!user?.businessId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { razorpay_subscription_id?: string; razorpay_payment_id?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { razorpay_subscription_id, razorpay_payment_id } = body;

    if (!razorpay_subscription_id) {
        return NextResponse.json({ error: 'Missing subscription ID' }, { status: 400 });
    }

    try {
        // Verify with Razorpay that the subscription is actually active/authenticated
        const rzpSub = await getRazorpay().subscriptions.fetch(razorpay_subscription_id) as unknown as Record<string, unknown>;
        const status = rzpSub.status as string;

        // Only update if Razorpay confirms a valid status
        const validStatuses = new Set(['created', 'authenticated', 'active']);
        if (!validStatuses.has(status)) {
            return NextResponse.json(
                { error: 'Subscription is not active', status },
                { status: 400 }
            );
        }

        let currentPeriodEnd: Date | null = null;
        if (rzpSub.current_end) {
            currentPeriodEnd = new Date((rzpSub.current_end as number) * 1000);
        }

        // Immediately update the DB so billing/status returns active
        await prisma.subscription.upsert({
            where: { businessId: user.businessId },
            create: {
                businessId: user.businessId,
                razorpayCustomerId: (rzpSub.customer_id as string) || undefined,
                razorpaySubscriptionId: razorpay_subscription_id,
                status,
                currentPeriodEnd,
            },
            update: {
                razorpaySubscriptionId: razorpay_subscription_id,
                status,
                currentPeriodEnd,
                ...(rzpSub.customer_id ? { razorpayCustomerId: rzpSub.customer_id as string } : {}),
            },
        });

        return NextResponse.json({
            success: true,
            status,
            subscriptionId: razorpay_subscription_id,
            paymentId: razorpay_payment_id,
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Failed to confirm subscription:', msg);
        return NextResponse.json({ error: 'Failed to confirm subscription', detail: msg }, { status: 500 });
    }
}


