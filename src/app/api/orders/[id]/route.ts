import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireActiveSubscription } from '@/lib/billing';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    const user = gate.user;

    const { id } = await params;
    const order = await prisma.order.findFirst({
        where: { id, businessId: user.businessId },
        include: {
            customer: true,
            items: { include: { product: true } },
            statusHistory: { orderBy: { createdAt: 'asc' } },
            manufacturingStages: { orderBy: { createdAt: 'asc' } },
        },
    });

    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(order);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    const user = gate.user;

    const { id } = await params;

    // Ensure the order belongs to the user's business
    const order = await prisma.order.findFirst({
        where: { id, businessId: user.businessId },
    });

    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.order.delete({
        where: { id },
    });

    return NextResponse.json({ success: true });
}
