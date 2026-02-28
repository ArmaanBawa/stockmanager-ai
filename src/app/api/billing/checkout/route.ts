import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getRazorpay } from '@/lib/razorpay';
import { getBillingUser } from '@/lib/billing';

export async function POST(req: NextRequest) {
    const user = await getBillingUser(req);
    if (!user?.businessId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const planId = process.env.RAZORPAY_PLAN_ID;

    if (!planId) {
        return NextResponse.json(
            { error: 'Billing plan is not configured' },
            { status: 500 }
        );
    }

    const existing = await prisma.subscription.findUnique({
        where: { businessId: user.businessId },
    });

    let customerId = existing?.razorpayCustomerId || undefined;

    if (!customerId) {
        try {
            const customer = await getRazorpay().customers.create({
                name: user.businessName || user.name,
                email: user.email,
                notes: {
                    businessId: user.businessId,
                    userId: user.id,
                },
            });
            customerId = customer.id;

            await prisma.subscription.upsert({
                where: { businessId: user.businessId },
                create: {
                    businessId: user.businessId,
                    razorpayCustomerId: customerId,
                    status: 'inactive',
                },
                update: {
                    razorpayCustomerId: customerId,
                },
            });
        } catch (error) {
            console.error('Failed to create Razorpay customer:', error);
            return NextResponse.json({ error: 'Failed to initialize billing' }, { status: 500 });
        }
    }

    try {
        const subscription = await getRazorpay().subscriptions.create({
            plan_id: planId,
            customer_notify: 1, // Let Razorpay handle emails/portal links
            total_count: 120, // max billing cycles (e.g. 10 years for monthly)
            notes: {
                businessId: user.businessId,
                userId: user.id,
            },
        });

        // We return the subscription ID to the frontend to trigger the checkout modal
        return NextResponse.json({
            subscriptionId: subscription.id,
            keyId: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error('Failed to create Razorpay subscription:', error);
        return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
    }
}
