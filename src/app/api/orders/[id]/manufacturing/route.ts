import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/helpers';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getSessionUser();
    if (!user?.businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
