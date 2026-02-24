import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getSessionUser();
    if (!user?.businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const order = await prisma.order.findFirst({
        where: { id, businessId: user.businessId },
        include: {
            supplier: true,
            items: { include: { product: true } },
            statusHistory: { orderBy: { createdAt: 'asc' } },
            manufacturingStages: { orderBy: { createdAt: 'asc' } },
        },
    });

    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(order);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getSessionUser();
    if (!user?.businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
