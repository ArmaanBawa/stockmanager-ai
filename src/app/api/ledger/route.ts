import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireActiveSubscription } from '@/lib/billing';

export async function GET(req: NextRequest) {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    const user = gate.user;

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const productId = searchParams.get('productId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: Record<string, unknown> = { businessId: user.businessId, type: 'SALE' };
    if (customerId) where.customerId = customerId;
    if (productId) where.productId = productId;
    if (from || to) {
        where.createdAt = {};
        if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
        if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
    }

    const entries = await prisma.ledgerEntry.findMany({
        where,
        include: {
            product: { select: { id: true, name: true } },
            order: { select: { id: true, orderNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    // Summary stats
    const totalSales = entries.length;
    const totalRevenue = entries.reduce((sum, e) => sum + e.totalAmount, 0);
    const totalItemsSold = entries.reduce((sum, e) => sum + e.quantity, 0);

    return NextResponse.json({ entries, summary: { totalSales, totalRevenue, totalItemsSold } });
}
