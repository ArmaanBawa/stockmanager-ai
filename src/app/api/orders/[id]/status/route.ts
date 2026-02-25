import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser, generateLotNumber } from '@/lib/helpers';

const VALID_STATUSES = ['PLACED', 'ACCEPTED', 'IN_MANUFACTURING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getSessionUser();
    if (!user?.businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { status, note } = await req.json();

    if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
        where: { id, businessId: user.businessId },
        include: { items: { include: { product: true } } },
    });

    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Update order status
    await prisma.order.update({
        where: { id },
        data: { status },
    });

    // Record in status history
    await prisma.orderStatusHistory.create({
        data: { orderId: id, status, note },
    });

    // If status is IN_MANUFACTURING, create manufacturing stages
    if (status === 'IN_MANUFACTURING') {
        const stages = ['RAW_MATERIAL_PREP', 'ASSEMBLY', 'QUALITY_CHECK', 'PACKAGING'];
        await prisma.manufacturingStage.createMany({
            data: stages.map(stage => ({
                orderId: id,
                stage,
                status: 'PENDING',
            })),
        });
    }

    // If DELIVERED, auto-create inventory lots and ledger entries
    if (status === 'DELIVERED') {
        for (const item of order.items) {
            // Create inventory lot
            await prisma.inventoryLot.create({
                data: {
                    lotNumber: generateLotNumber(),
                    quantity: item.quantity,
                    remainingQty: item.quantity,
                    costPerUnit: item.unitPrice,
                    businessId: user.businessId,
                    productId: item.productId,
                    orderId: id,
                },
            });

            // Create ledger entry
            await prisma.ledgerEntry.create({
                data: {
                    type: 'SALE',
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalAmount: item.total,
                    description: `Sale of ${item.product.name} via order ${order.orderNumber}`,
                    businessId: user.businessId,
                    productId: item.productId,
                    orderId: id,
                    customerId: order.customerId,
                },
            });
        }
    }

    return NextResponse.json({ success: true, status });
}
