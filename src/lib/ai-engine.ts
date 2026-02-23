import prisma from '@/lib/prisma';

interface Insight {
    type: string;
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
    productId?: string;
}

export async function generateInsights(businessId: string): Promise<Insight[]> {
    const insights: Insight[] = [];

    const products = await prisma.product.findMany({
        where: { businessId },
        include: {
            inventoryLots: true,
            inventoryUsages: true,
            orderItems: {
                include: {
                    order: { select: { status: true, createdAt: true } },
                },
            },
        },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const product of products) {
        const totalStock = product.inventoryLots.reduce((sum, lot) => sum + lot.remainingQty, 0);

        // Recent usage (last 30 days)
        const recentUsage = product.inventoryUsages
            .filter(u => new Date(u.createdAt) >= thirtyDaysAgo)
            .reduce((sum, u) => sum + u.quantity, 0);
        const dailyUsageRate = recentUsage / 30;

        // 1. Low stock alert
        if (totalStock <= product.reorderLevel && totalStock > 0) {
            insights.push({
                type: 'LOW_STOCK',
                title: `Low Stock: ${product.name}`,
                message: `Current stock (${totalStock} ${product.unit}) is at or below reorder level (${product.reorderLevel} ${product.unit}). Consider placing a reorder.`,
                severity: 'warning',
                productId: product.id,
            });
        }

        // 2. Out of stock
        if (totalStock === 0 && product.inventoryLots.length > 0) {
            insights.push({
                type: 'OUT_OF_STOCK',
                title: `Out of Stock: ${product.name}`,
                message: `${product.name} is completely out of stock. Immediate reorder recommended.`,
                severity: 'critical',
                productId: product.id,
            });
        }

        // 3. Days remaining estimate
        if (dailyUsageRate > 0 && totalStock > 0) {
            const daysRemaining = Math.round(totalStock / dailyUsageRate);
            if (daysRemaining <= 14) {
                insights.push({
                    type: 'REORDER_SOON',
                    title: `Reorder Soon: ${product.name}`,
                    message: `At current usage rate (${dailyUsageRate.toFixed(1)} ${product.unit}/day), stock will last approximately ${daysRemaining} days. Consider reordering now.`,
                    severity: daysRemaining <= 7 ? 'critical' : 'warning',
                    productId: product.id,
                });
            }
        }

        // 4. Slow-moving inventory
        if (totalStock > 0 && recentUsage === 0 && product.inventoryLots.length > 0) {
            insights.push({
                type: 'SLOW_MOVING',
                title: `Slow Moving: ${product.name}`,
                message: `${product.name} has ${totalStock} ${product.unit} in stock but no usage in the last 30 days. Consider reviewing if this stock is still needed.`,
                severity: 'info',
                productId: product.id,
            });
        }

        // 5. Duplicate order prevention
        const pendingOrders = product.orderItems.filter(
            oi => ['PLACED', 'ACCEPTED', 'IN_MANUFACTURING'].includes(oi.order.status)
        );
        if (pendingOrders.length > 1) {
            const pendingQty = pendingOrders.reduce((sum, oi) => sum + oi.quantity, 0);
            insights.push({
                type: 'DUPLICATE_ORDERS',
                title: `Multiple Pending Orders: ${product.name}`,
                message: `There are ${pendingOrders.length} pending orders for ${product.name} totaling ${pendingQty} ${product.unit}. Check if these are intentional.`,
                severity: 'warning',
                productId: product.id,
            });
        }

        // 6. Demand prediction (monthly trend)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const usageM3 = product.inventoryUsages
            .filter(u => new Date(u.createdAt) >= threeMonthsAgo && new Date(u.createdAt) < twoMonthsAgo)
            .reduce((sum, u) => sum + u.quantity, 0);
        const usageM2 = product.inventoryUsages
            .filter(u => new Date(u.createdAt) >= twoMonthsAgo && new Date(u.createdAt) < oneMonthAgo)
            .reduce((sum, u) => sum + u.quantity, 0);
        const usageM1 = product.inventoryUsages
            .filter(u => new Date(u.createdAt) >= oneMonthAgo)
            .reduce((sum, u) => sum + u.quantity, 0);

        if (usageM1 > 0 && usageM2 > 0 && usageM1 > usageM2 * 1.3) {
            insights.push({
                type: 'DEMAND_INCREASING',
                title: `Rising Demand: ${product.name}`,
                message: `Usage of ${product.name} increased ${Math.round(((usageM1 - usageM2) / usageM2) * 100)}% compared to the previous month. Consider increasing order quantities.`,
                severity: 'info',
                productId: product.id,
            });
        }
    }

    // Sort by severity
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return insights;
}
