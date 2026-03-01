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
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!planId || !keyId || !keySecret) {
        console.error('Missing Razorpay env vars:', { planId: !!planId, keyId: !!keyId, keySecret: !!keySecret });
        return NextResponse.json(
            { error: 'Billing is not configured on the server. Please contact support.' },
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
        } catch (error: any) {
            // If customer already exists in Razorpay, fetch them by email
            const desc = error?.error?.description || error?.message || '';
            if (desc.toLowerCase().includes('already exists')) {
                try {
                    const customers = await getRazorpay().customers.all({ count: 1 } as any);
                    // Razorpay doesn't support email filter — search through recent customers
                    // Instead, use a direct fetch if we have the ID, or iterate
                    const allCustomers = (customers as any).items || [];
                    const match = allCustomers.find((c: any) => c.email === user.email);
                    if (match) {
                        customerId = match.id;
                    }
                } catch {
                    // Fallback: proceed without customerId — subscription creation still works
                }

                if (!customerId) {
                    // If we still can't find the customer, that's OK —
                    // Razorpay subscriptions work without customer_id
                    console.warn('Customer exists in Razorpay but could not fetch ID, proceeding without it');
                }
            } else {
                console.error('Failed to create Razorpay customer:', error?.message || error);
                return NextResponse.json({ error: 'Failed to initialize billing', detail: error?.message }, { status: 500 });
            }
        }

        // Save the customerId if we got one
        if (customerId) {
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

    } catch (error: any) {
        console.error('Failed to create Razorpay subscription:', error?.message || error);
        return NextResponse.json({ error: 'Failed to create subscription', detail: error?.message }, { status: 500 });
    }
}
