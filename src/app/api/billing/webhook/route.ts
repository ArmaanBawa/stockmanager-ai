import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';


export async function POST(req: NextRequest) {
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 });
    }

    const payload = await req.text();

    const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

    if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    try {
        const event = JSON.parse(payload);
        const { event: eventType, payload: eventPayload } = event;

        switch (eventType) {
            case 'subscription.charged':
            case 'subscription.authenticated':
            case 'subscription.activated':
            case 'subscription.updated':
            case 'subscription.halted':
            case 'subscription.cancelled':
            case 'subscription.completed':
                const subscription = eventPayload.subscription.entity;
                const customerId = subscription.customer_id;
                const status = subscription.status;

                let currentPeriodEnd = null;
                if (subscription.current_end) {
                    currentPeriodEnd = new Date(subscription.current_end * 1000);
                }

                // If notes are not present on webhook, we might need to find by razorpaySubscriptionId or customerId
                let businessId = subscription.notes?.businessId;

                if (!businessId) {
                    const existing = await prisma.subscription.findFirst({
                        where: {
                            OR: [
                                { razorpaySubscriptionId: subscription.id },
                                { razorpayCustomerId: customerId },
                            ],
                        },
                    });
                    businessId = existing?.businessId;
                }

                if (businessId) {
                    await prisma.subscription.upsert({
                        where: { businessId },
                        create: {
                            businessId,
                            razorpayCustomerId: customerId,
                            razorpaySubscriptionId: subscription.id,
                            status,
                            currentPeriodEnd,
                        },
                        update: {
                            razorpayCustomerId: customerId,
                            razorpaySubscriptionId: subscription.id,
                            status,
                            currentPeriodEnd,
                        },
                    });
                }
                break;
            default:
                break;
        }
    } catch (error) {
        console.error('Razorpay webhook error:', error);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
