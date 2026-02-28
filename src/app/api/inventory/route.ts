import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireActiveSubscription } from '@/lib/billing';

export async function GET(req: NextRequest) {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    const user = gate.user;

    // Get all products with their inventory lots and usage
    const products = await prisma.product.findMany({
        where: { businessId: user.businessId },
        include: {
            customer: { select: { name: true } },
            inventoryLots: {
                select: { id: true, lotNumber: true, quantity: true, remainingQty: true, costPerUnit: true, receivedAt: true },
                orderBy: { receivedAt: 'desc' },
            },
            inventoryUsages: {
                select: { quantity: true, createdAt: true },
            },
        },
    });

    const inventory = products.map(product => {
        const totalStock = product.inventoryLots.reduce((sum, lot) => sum + lot.remainingQty, 0);
        const totalUsed = product.inventoryUsages.reduce((sum, u) => sum + u.quantity, 0);

        // Calculate daily usage rate (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentUsage = product.inventoryUsages
            .filter(u => new Date(u.createdAt) >= thirtyDaysAgo)
            .reduce((sum, u) => sum + u.quantity, 0);
        const dailyUsageRate = recentUsage / 30;
        const daysRemaining = dailyUsageRate > 0 ? Math.round(totalStock / dailyUsageRate) : null;

        return {
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            unit: product.unit,
            customerName: product.customer?.name,
            reorderLevel: product.reorderLevel,
            totalStock,
            totalUsed,
            dailyUsageRate: Math.round(dailyUsageRate * 100) / 100,
            daysRemaining,
            isLowStock: totalStock <= product.reorderLevel,
            lots: product.inventoryLots,
        };
    });

    return NextResponse.json(inventory);
}

export async function POST(req: NextRequest) {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    const user = gate.user;

    const { productId, quantity, reason } = await req.json();

    if (!productId || !quantity) {
        return NextResponse.json({ error: 'Product and quantity required' }, { status: 400 });
    }

    // Deduct from oldest lots first (FIFO)
    const lots = await prisma.inventoryLot.findMany({
        where: { productId, businessId: user.businessId, remainingQty: { gt: 0 } },
        orderBy: { receivedAt: 'asc' },
    });

    let remaining = quantity;
    for (const lot of lots) {
        if (remaining <= 0) break;
        const deduct = Math.min(remaining, lot.remainingQty);
        await prisma.inventoryLot.update({
            where: { id: lot.id },
            data: { remainingQty: lot.remainingQty - deduct },
        });
        remaining -= deduct;
    }

    if (remaining > 0) {
        return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });
    }

    // Record usage
    await prisma.inventoryUsage.create({
        data: {
            quantity,
            reason: reason || 'Manual usage',
            businessId: user.businessId,
            productId,
        },
    });

    return NextResponse.json({ success: true });
}

// PUT — Add stock directly to a product
export async function PUT(req: NextRequest) {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    const user = gate.user;

    const { productId, quantity, costPerUnit, note } = await req.json();

    if (!productId || !quantity || quantity <= 0) {
        return NextResponse.json({ error: 'Product and valid quantity required' }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
        where: { id: productId, businessId: user.businessId },
    });

    if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Create an inventory lot
    const lotPrefix = 'LOT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const lotNumber = `${lotPrefix}-${timestamp}-${random}`;

    await prisma.inventoryLot.create({
        data: {
            lotNumber,
            quantity,
            remainingQty: quantity,
            costPerUnit: costPerUnit || product.unitPrice,
            businessId: user.businessId,
            productId,
        },
    });

    // Create ledger entry for the stock addition
    await prisma.ledgerEntry.create({
        data: {
            type: 'STOCK_IN',
            quantity,
            unitPrice: costPerUnit || product.unitPrice,
            totalAmount: quantity * (costPerUnit || product.unitPrice),
            description: note || `Stock added for ${product.name}`,
            businessId: user.businessId,
            productId,
        },
    });

    return NextResponse.json({ success: true });
}
