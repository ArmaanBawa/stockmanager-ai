import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireActiveSubscription } from '@/lib/billing';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    const user = gate.user;

    const { id } = await params;
    const { stageId, status, note } = await req.json();

    const order = await prisma.order.findFirst({
        where: { id, businessId: user.businessId },
    });

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    await prisma.manufacturingStage.update({
        where: { id: stageId },
        data: { status, note },
    });

    return NextResponse.json({ success: true });
}
