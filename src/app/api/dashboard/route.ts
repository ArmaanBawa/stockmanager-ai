import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/helpers';

export async function GET() {
    const user = await getSessionUser();
    if (!user?.businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [
        totalOrders,
        activeOrders,
        totalSuppliers,
        totalProducts,
        recentOrders,
        inventoryLots,
        ledgerEntries,
    ] = await Promise.all([
        prisma.order.count({ where: { businessId: user.businessId } }),
        prisma.order.count({ where: { businessId: user.businessId, status: { notIn: ['DELIVERED', 'CANCELLED'] } } }),
        prisma.supplier.count({ where: { businessId: user.businessId } }),
        prisma.product.count({ where: { businessId: user.businessId } }),
        prisma.order.findMany({
            where: { businessId: user.businessId },
            include: {
                supplier: { select: { name: true } },
                items: { include: { product: { select: { name: true } } } },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
        }),
        prisma.inventoryLot.findMany({ where: { businessId: user.businessId } }),
        prisma.ledgerEntry.findMany({
            where: { businessId: user.businessId },
            orderBy: { createdAt: 'desc' },
            take: 5,
        }),
    ]);

    const totalStockValue = inventoryLots.reduce((sum, lot) => sum + lot.remainingQty * lot.costPerUnit, 0);
    const totalStockUnits = inventoryLots.reduce((sum, lot) => sum + lot.remainingQty, 0);
    const totalSpent = ledgerEntries.reduce((sum, e) => sum + e.totalAmount, 0);

    return NextResponse.json({
        stats: {
            totalOrders,
            activeOrders,
            totalSuppliers,
            totalProducts,
            totalStockValue,
            totalStockUnits,
            totalSpent,
        },
        recentOrders,
    });
}
