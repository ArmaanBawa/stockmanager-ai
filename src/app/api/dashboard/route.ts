import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireActiveSubscription } from '@/lib/billing';
import redis from '@/lib/redis';

export async function GET(req: NextRequest) {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    const user = gate.user;

    // Try to get cached data
    const cacheKey = `dashboard:${user.businessId}`;
    try {
        const cached = await redis.get(cacheKey);
        if (cached) return NextResponse.json(cached);
    } catch (err) {
        console.error('Redis cache error:', err);
    }

    const [
        totalOrders,
        activeOrders,
        totalCustomers,
        totalProducts,
        recentOrders,
        inventoryLots,
        ledgerEntries,
    ] = await Promise.all([
        prisma.order.count({ where: { businessId: user.businessId } }),
        prisma.order.count({ where: { businessId: user.businessId, status: { notIn: ['DELIVERED', 'CANCELLED'] } } }),
        prisma.customer.count({ where: { businessId: user.businessId } }),
        prisma.product.count({ where: { businessId: user.businessId } }),
        prisma.order.findMany({
            where: { businessId: user.businessId },
            include: {
                customer: { select: { name: true } },
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

    const data = {
        stats: {
            totalOrders,
            activeOrders,
            totalCustomers,
            totalProducts,
            totalStockValue,
            totalStockUnits,
            totalSpent,
        },
        recentOrders,
    };

    // Cache the data for 5 minutes
    try {
        await redis.set(cacheKey, JSON.stringify(data), { ex: 300 });
    } catch (err) {
        console.error('Redis set error:', err);
    }

    return NextResponse.json(data);
}
