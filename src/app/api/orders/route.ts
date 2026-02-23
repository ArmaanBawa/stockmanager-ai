import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser, generateOrderNumber } from '@/lib/helpers';

export async function GET(req: NextRequest) {
    const user = await getSessionUser();
    if (!user?.businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplierId');

    const where: Record<string, unknown> = { businessId: user.businessId };
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const orders = await prisma.order.findMany({
        where,
        include: {
            supplier: { select: { id: true, name: true } },
            items: { include: { product: { select: { id: true, name: true } } } },
            _count: { select: { statusHistory: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
    const user = await getSessionUser();
    if (!user?.businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { supplierId, items, notes, expectedDelivery } = await req.json();

    if (!supplierId || !items || items.length === 0) {
        return NextResponse.json({ error: 'Supplier and at least one item required' }, { status: 400 });
    }

    const totalAmount = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * item.unitPrice, 0
    );

    const order = await prisma.order.create({
        data: {
            orderNumber: generateOrderNumber(),
            businessId: user.businessId,
            supplierId,
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
            supplier: true,
            items: { include: { product: true } },
            statusHistory: true,
        },
    });

    return NextResponse.json(order, { status: 201 });
}
