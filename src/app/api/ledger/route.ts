import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/helpers';

export async function GET(req: NextRequest) {
    const user = await getSessionUser();
    if (!user?.businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get('supplierId');
    const productId = searchParams.get('productId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: Record<string, unknown> = { businessId: user.businessId };
    if (supplierId) where.supplierId = supplierId;
    if (productId) where.productId = productId;
    if (from || to) {
        where.createdAt = {};
        if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
        if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
    }

    const entries = await prisma.ledgerEntry.findMany({
        where,
        include: {
            product: { select: { id: true, name: true, sku: true } },
            order: { select: { id: true, orderNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    // Summary stats
    const totalPurchases = entries.length;
    const totalSpent = entries.reduce((sum, e) => sum + e.totalAmount, 0);
    const totalItems = entries.reduce((sum, e) => sum + e.quantity, 0);

    return NextResponse.json({ entries, summary: { totalPurchases, totalSpent, totalItems } });
}
