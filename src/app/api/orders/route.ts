import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateOrderNumber } from '@/lib/helpers';
import { requireActiveSubscription } from '@/lib/billing';

export async function GET(req: NextRequest) {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    const user = gate.user;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');

    const where: Record<string, unknown> = { businessId: user.businessId };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const orders = await prisma.order.findMany({
        where,
        include: {
            customer: { select: { id: true, name: true } },
            items: { include: { product: { select: { id: true, name: true } } } },
            _count: { select: { statusHistory: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    const user = gate.user;

    const { customerId, items, notes, expectedDelivery } = await req.json();

    if (!customerId || !items || items.length === 0) {
        return NextResponse.json({ error: 'Customer and at least one item required' }, { status: 400 });
    }

    const totalAmount = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * item.unitPrice, 0
    );

    const order = await prisma.order.create({
        data: {
            orderNumber: generateOrderNumber(),
            businessId: user.businessId,
            customerId,
            totalAmount,
            notes,
            expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
            items: {
                create: items.map((item: { productId: string; quantity: number; unitPrice: number }) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    total: item.quantity * item.unitPrice,
                })),
            },
            statusHistory: {
                create: { status: 'PLACED', note: 'Order placed' },
            },
        },
        include: {
            customer: true,
            items: { include: { product: true } },
            statusHistory: true,
        },
    });

    // Deduct stock and create sale ledger entries for each order item
    for (const item of order.items) {
        // FIFO stock deduction
        const lots = await prisma.inventoryLot.findMany({
            where: { productId: item.productId, businessId: user.businessId, remainingQty: { gt: 0 } },
            orderBy: { receivedAt: 'asc' },
        });

        let remaining = item.quantity;
        for (const lot of lots) {
            if (remaining <= 0) break;
            const deduct = Math.min(remaining, lot.remainingQty);
            await prisma.inventoryLot.update({
                where: { id: lot.id },
                data: { remainingQty: lot.remainingQty - deduct },
            });
            remaining -= deduct;
        }

        // Record usage for tracking
        if (item.quantity - remaining > 0) {
            await prisma.inventoryUsage.create({
                data: {
                    quantity: item.quantity - remaining,
                    reason: `Sold via order ${order.orderNumber}`,
                    businessId: user.businessId,
                    productId: item.productId,
                },
            });
        }

        // Create SALE ledger entry
        await prisma.ledgerEntry.create({
            data: {
                type: 'SALE',
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalAmount: item.quantity * item.unitPrice,
                description: `Sale of ${item.product.name} to ${order.customer.name} via ${order.orderNumber}`,
                businessId: user.businessId,
                productId: item.productId,
                orderId: order.id,
                customerId,
            },
        });
    }

    return NextResponse.json(order, { status: 201 });
}
