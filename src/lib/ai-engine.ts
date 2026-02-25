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

    // Get sales data
    const salesEntries = await prisma.ledgerEntry.findMany({
        where: { businessId, type: 'SALE' },
        include: { product: { select: { name: true } } },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const product of products) {
        const totalStock = product.inventoryLots.reduce((sum, lot) => sum + lot.remainingQty, 0);

        // Recent usage/sales (last 30 days)
        const recentUsage = product.inventoryUsages
            .filter(u => new Date(u.createdAt) >= thirtyDaysAgo)
            .reduce((sum, u) => sum + u.quantity, 0);
        const dailyUsageRate = recentUsage / 30;

        // 1. Low stock alert
        if (totalStock > 0 && totalStock <= product.reorderLevel) {
            insights.push({
                type: 'LOW_STOCK',
                title: `Low Stock: ${product.name}`,
                message: `Only ${totalStock} m remaining. You may not be able to fulfill upcoming orders. Consider restocking.`,
                severity: 'warning',
                productId: product.id,
            });
        }

        // 2. Out of stock
        if (totalStock === 0 && product.inventoryLots.length > 0) {
            insights.push({
                type: 'OUT_OF_STOCK',
                title: `Out of Stock: ${product.name}`,
                message: `${product.name} is completely out of stock. You cannot fulfill any new orders for this product. Restock immediately.`,
                severity: 'critical',
                productId: product.id,
            });
        }

        // 3. Days remaining estimate
        if (dailyUsageRate > 0 && totalStock > 0) {
            const daysRemaining = Math.round(totalStock / dailyUsageRate);
            if (daysRemaining <= 14) {
                insights.push({
                    type: 'STOCK_RUNNING_LOW',
                    title: `Stock Running Low: ${product.name}`,
                    message: `At current sales rate (${dailyUsageRate.toFixed(1)} m/day), stock will last ~${daysRemaining} days. Restock soon to avoid missed sales.`,
                    severity: daysRemaining <= 7 ? 'critical' : 'warning',
                    productId: product.id,
                });
            }
        }

        // 4. Slow-moving inventory
        if (totalStock > 0 && recentUsage === 0 && product.inventoryLots.length > 0) {
            insights.push({
                type: 'SLOW_MOVING',
                title: `No Sales: ${product.name}`,
                message: `${product.name} has ${totalStock} m in stock but no sales in the last 30 days. Consider running a promotion or adjusting pricing.`,
                severity: 'info',
                productId: product.id,
            });
        }

        // 5. High demand product
        const recentSales = product.orderItems.filter(
            oi => new Date(oi.order.createdAt) >= thirtyDaysAgo
        );
        if (recentSales.length >= 3) {
            const totalSoldQty = recentSales.reduce((sum, oi) => sum + oi.quantity, 0);
            insights.push({
                type: 'HIGH_DEMAND',
                title: `Top Seller: ${product.name}`,
                message: `${product.name} has ${recentSales.length} orders totaling ${totalSoldQty} m sold in the last 30 days. Keep stock levels high.`,
                severity: 'info',
                productId: product.id,
            });
        }

        // 6. Sales trend (monthly comparison)
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const usageLastMonth = product.inventoryUsages
            .filter(u => new Date(u.createdAt) >= oneMonthAgo)
            .reduce((sum, u) => sum + u.quantity, 0);
        const usagePrevMonth = product.inventoryUsages
            .filter(u => new Date(u.createdAt) >= twoMonthsAgo && new Date(u.createdAt) < oneMonthAgo)
            .reduce((sum, u) => sum + u.quantity, 0);

        if (usageLastMonth > 0 && usagePrevMonth > 0 && usageLastMonth > usagePrevMonth * 1.3) {
            insights.push({
                type: 'SALES_INCREASING',
                title: `Sales Growing: ${product.name}`,
                message: `Sales of ${product.name} increased ${Math.round(((usageLastMonth - usagePrevMonth) / usagePrevMonth) * 100)}% compared to the previous month. Great momentum!`,
                severity: 'info',
                productId: product.id,
            });
        }

        if (usageLastMonth > 0 && usagePrevMonth > 0 && usageLastMonth < usagePrevMonth * 0.7) {
            insights.push({
                type: 'SALES_DECLINING',
                title: `Sales Declining: ${product.name}`,
                message: `Sales of ${product.name} dropped ${Math.round(((usagePrevMonth - usageLastMonth) / usagePrevMonth) * 100)}% compared to the previous month. Review pricing or demand.`,
                severity: 'warning',
                productId: product.id,
            });
        }
    }

    // Overall revenue insight
    const recentSalesEntries = salesEntries.filter(e => new Date(e.createdAt) >= thirtyDaysAgo);
    const monthlyRevenue = recentSalesEntries.reduce((sum, e) => sum + e.totalAmount, 0);
    if (monthlyRevenue > 0) {
        insights.push({
            type: 'REVENUE_SUMMARY',
            title: 'Monthly Revenue',
            message: `Total revenue in the last 30 days: ₹${monthlyRevenue.toLocaleString()} from ${recentSalesEntries.length} sales transactions.`,
            severity: 'info',
        });
    }

    // Sort by severity
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return insights;
}
