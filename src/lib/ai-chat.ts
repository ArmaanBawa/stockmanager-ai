import prisma from '@/lib/prisma';
import { generateInsights } from '@/lib/ai-engine';

export async function getOrderTracking(businessId: string, supplierName?: string) {
    const where: any = { businessId };
    if (supplierName) {
        const suppliers = await prisma.supplier.findMany({ where: { businessId } });
        const matched = suppliers.find(s => s.name.toLowerCase().includes(supplierName.toLowerCase()));
        if (matched) where.supplierId = matched.id;
    }

    const orders = await prisma.order.findMany({
        where,
        include: {
            supplier: { select: { name: true } },
            items: { include: { product: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
    });

    return orders;
}

export async function getStockLevels(businessId: string, productName?: string) {
    const products = await prisma.product.findMany({
        where: { businessId },
        include: { inventoryLots: true, inventoryUsages: true },
    });

    if (productName) {
        return products.filter(p => p.name.toLowerCase().includes(productName.toLowerCase()));
    }

    return products;
}

export async function getBusinessInsights(businessId: string) {
    return await generateInsights(businessId);
}

export async function getPurchaseHistory(businessId: string, period?: string, supplierName?: string) {
    const now = new Date();
    let from = new Date();
    if (period === 'last month') from.setMonth(from.getMonth() - 1);
    else if (period === 'last week') from.setDate(from.getDate() - 7);
    else if (period === 'last year') from.setFullYear(from.getFullYear() - 1);
    else from.setMonth(from.getMonth() - 1);

    const where: any = {
        businessId,
        createdAt: { gte: from, lte: now },
    };

    if (supplierName) {
        const suppliers = await prisma.supplier.findMany({ where: { businessId } });
        const matched = suppliers.find(s => s.name.toLowerCase().includes(supplierName.toLowerCase()));
        if (matched) where.supplierId = matched.id;
    }

    const entries = await prisma.ledgerEntry.findMany({
        where,
        include: { product: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
    });

    return entries;
}

export async function getSuppliers(businessId: string) {
    return await prisma.supplier.findMany({
        where: { businessId },
        include: { _count: { select: { orders: true, products: true } } },
    });
}
