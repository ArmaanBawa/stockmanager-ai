import prisma from '@/lib/prisma';
import { generateInsights } from '@/lib/ai-engine';

export async function getOrderTracking(businessId: string, customerName?: string) {
    const where: any = { businessId };
    if (customerName) {
        const customers = await prisma.customer.findMany({ where: { businessId } });
        const matched = customers.find(s => s.name.toLowerCase().includes(customerName.toLowerCase()));
        if (matched) where.customerId = matched.id;
    }

    const orders = await prisma.order.findMany({
        where,
        include: {
            customer: { select: { name: true } },
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

export async function getSalesHistory(businessId: string, period?: string, customerName?: string) {
    const now = new Date();
    const from = new Date();
    if (period === 'last month') from.setMonth(from.getMonth() - 1);
    else if (period === 'last week') from.setDate(from.getDate() - 7);
    else if (period === 'last year') from.setFullYear(from.getFullYear() - 1);
    else from.setMonth(from.getMonth() - 1);

    const where: any = {
        businessId,
        type: 'SALE',
        createdAt: { gte: from, lte: now },
    };

    if (customerName) {
        const customers = await prisma.customer.findMany({ where: { businessId } });
        const matched = customers.find(s => s.name.toLowerCase().includes(customerName.toLowerCase()));
        if (matched) where.customerId = matched.id;
    }

    const entries = await prisma.ledgerEntry.findMany({
        where,
        include: {
            product: { select: { name: true } },
            order: { select: { orderNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    const totalRevenue = entries.reduce((sum, e) => sum + e.totalAmount, 0);
    const totalItemsSold = entries.reduce((sum, e) => sum + e.quantity, 0);

    return { entries, totalRevenue, totalItemsSold, totalSales: entries.length };
}

export async function getCustomers(businessId: string) {
    return await prisma.customer.findMany({
        where: { businessId },
        include: { _count: { select: { orders: true, products: true } } },
    });
}
