import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST() {
    try {
        console.log('🌱 Seeding database...');

        // Clean existing data
        await prisma.aiInsight.deleteMany();
        await prisma.inventoryUsage.deleteMany();
        await prisma.inventoryLot.deleteMany();
        await prisma.ledgerEntry.deleteMany();
        await prisma.manufacturingStage.deleteMany();
        await prisma.orderStatusHistory.deleteMany();
        await prisma.orderItem.deleteMany();
        await prisma.order.deleteMany();
        await prisma.product.deleteMany();
        await prisma.customer.deleteMany();
        await prisma.user.deleteMany();
        await prisma.business.deleteMany();

        // Create business
        const business = await prisma.business.create({
            data: {
                name: 'Acme Electronics Pvt Ltd',
                address: '123 Industrial Park, Pune',
                phone: '+91 98765 43210',
                email: 'info@acme-electronics.com',
            },
        });

        // Create user
        const hashedPassword = await bcrypt.hash('password123', 12);
        await prisma.user.create({
            data: {
                name: 'Rahul Sharma',
                email: 'rahul@acme.com',
                hashedPassword,
                businessId: business.id,
            },
        });

        // Create customers
        const customer1 = await prisma.customer.create({
            data: { name: 'TechParts Manufacturing', contactName: 'Amit Kumar', email: 'amit@techparts.com', phone: '+91 98765 11111', address: 'Plot 45, MIDC, Mumbai', businessId: business.id },
        });
        const customer2 = await prisma.customer.create({
            data: { name: 'GlobalChip Solutions', contactName: 'Priya Patel', email: 'priya@globalchip.com', phone: '+91 98765 22222', address: '789 Electronics Zone, Bangalore', businessId: business.id },
        });
        const customer3 = await prisma.customer.create({
            data: { name: 'PackRight Industries', contactName: 'Sanjay Mehta', email: 'sanjay@packright.com', phone: '+91 98765 33333', address: '56 Packaging Lane, Chennai', businessId: business.id },
        });

        // Create products
        const product1 = await prisma.product.create({
            data: { name: 'Circuit Board PCB-X200', sku: 'PCB-X200', description: 'High-performance multi-layer circuit board', unitPrice: 850, unit: 'pcs', reorderLevel: 50, businessId: business.id, customerId: customer1.id },
        });
        const product2 = await prisma.product.create({
            data: { name: 'ARM Cortex M4 Chip', sku: 'ARM-M4-001', description: '32-bit microcontroller chip', unitPrice: 320, unit: 'pcs', reorderLevel: 100, businessId: business.id, customerId: customer2.id },
        });
        const product3 = await prisma.product.create({
            data: { name: 'LED Display Module 5"', sku: 'LED-DSP-5', description: '5-inch OLED display panel', unitPrice: 1200, unit: 'pcs', reorderLevel: 30, businessId: business.id, customerId: customer1.id },
        });
        const product4 = await prisma.product.create({
            data: { name: 'Anti-Static Packaging Box', sku: 'PKG-AS-100', description: 'ESD-safe packaging for electronics', unitPrice: 45, unit: 'box', reorderLevel: 200, businessId: business.id, customerId: customer3.id },
        });
        const product5 = await prisma.product.create({
            data: { name: 'Capacitor Set 100μF', sku: 'CAP-100UF', description: 'Electrolytic capacitor pack', unitPrice: 15, unit: 'pack', reorderLevel: 500, businessId: business.id, customerId: customer2.id },
        });

        // Order 1: Delivered
        const order1 = await prisma.order.create({
            data: {
                orderNumber: 'PO-DEMO-001', status: 'DELIVERED', totalAmount: 42500, businessId: business.id, customerId: customer1.id,
                items: { create: [{ productId: product1.id, quantity: 50, unitPrice: 850, total: 42500 }] },
                statusHistory: {
                    create: [
                        { status: 'PLACED', note: 'Order placed', createdAt: new Date('2026-01-15') },
                        { status: 'ACCEPTED', note: 'Accepted by customer', createdAt: new Date('2026-01-16') },
                        { status: 'IN_MANUFACTURING', note: 'Production started', createdAt: new Date('2026-01-18') },
                        { status: 'DISPATCHED', note: 'Shipped via BlueDart', createdAt: new Date('2026-02-01') },
                        { status: 'DELIVERED', note: 'Received at warehouse', createdAt: new Date('2026-02-05') },
                    ],
                },
            },
        });

        await prisma.inventoryLot.create({
            data: { lotNumber: 'LOT-DEMO-001', quantity: 50, remainingQty: 35, costPerUnit: 850, businessId: business.id, productId: product1.id, orderId: order1.id, receivedAt: new Date('2026-02-05') },
        });
        await prisma.inventoryUsage.create({
            data: { quantity: 15, reason: 'Used in production batch #45', businessId: business.id, productId: product1.id, createdAt: new Date('2026-02-10') },
        });
        await prisma.ledgerEntry.create({
            data: { type: 'PURCHASE', quantity: 50, unitPrice: 850, totalAmount: 42500, description: 'Purchase of Circuit Board PCB-X200 via order PO-DEMO-001', businessId: business.id, productId: product1.id, orderId: order1.id, customerId: customer1.id, createdAt: new Date('2026-02-05') },
        });

        // Order 2: In Manufacturing
        await prisma.order.create({
            data: {
                orderNumber: 'PO-DEMO-002', status: 'IN_MANUFACTURING', totalAmount: 64000, businessId: business.id, customerId: customer2.id,
                items: { create: [{ productId: product2.id, quantity: 200, unitPrice: 320, total: 64000 }] },
                statusHistory: {
                    create: [
                        { status: 'PLACED', note: 'Order placed', createdAt: new Date('2026-02-10') },
                        { status: 'ACCEPTED', note: 'Confirmed by GlobalChip', createdAt: new Date('2026-02-11') },
                        { status: 'IN_MANUFACTURING', note: 'Chip fabrication started', createdAt: new Date('2026-02-13') },
                    ],
                },
                manufacturingStages: {
                    create: [
                        { stage: 'RAW_MATERIAL_PREP', status: 'COMPLETED' },
                        { stage: 'ASSEMBLY', status: 'IN_PROGRESS' },
                        { stage: 'QUALITY_CHECK', status: 'PENDING' },
                        { stage: 'PACKAGING', status: 'PENDING' },
                    ],
                },
            },
        });

        // Order 3: Dispatched
        await prisma.order.create({
            data: {
                orderNumber: 'PO-DEMO-003', status: 'DISPATCHED', totalAmount: 36000, businessId: business.id, customerId: customer1.id,
                items: { create: [{ productId: product3.id, quantity: 30, unitPrice: 1200, total: 36000 }] },
                statusHistory: {
                    create: [
                        { status: 'PLACED', note: 'Order placed', createdAt: new Date('2026-02-08') },
                        { status: 'ACCEPTED', note: 'Accepted', createdAt: new Date('2026-02-09') },
                        { status: 'IN_MANUFACTURING', note: 'Manufacturing started', createdAt: new Date('2026-02-12') },
                        { status: 'DISPATCHED', note: 'Shipped via Delhivery', createdAt: new Date('2026-02-20') },
                    ],
                },
            },
        });

        // Order 4: Recently placed
        await prisma.order.create({
            data: {
                orderNumber: 'PO-DEMO-004', status: 'PLACED', totalAmount: 9000, businessId: business.id, customerId: customer3.id,
                items: { create: [{ productId: product4.id, quantity: 200, unitPrice: 45, total: 9000 }] },
                statusHistory: { create: [{ status: 'PLACED', note: 'Packaging order placed', createdAt: new Date('2026-02-22') }] },
            },
        });

        // Additional inventory lots
        await prisma.inventoryLot.create({
            data: { lotNumber: 'LOT-DEMO-002', quantity: 300, remainingQty: 80, costPerUnit: 320, businessId: business.id, productId: product2.id, receivedAt: new Date('2026-01-20') },
        });
        await prisma.inventoryUsage.createMany({
            data: [
                { quantity: 100, reason: 'Production batch #40', businessId: business.id, productId: product2.id, createdAt: new Date('2026-01-25') },
                { quantity: 70, reason: 'Production batch #42', businessId: business.id, productId: product2.id, createdAt: new Date('2026-02-05') },
                { quantity: 50, reason: 'Production batch #44', businessId: business.id, productId: product2.id, createdAt: new Date('2026-02-15') },
            ],
        });
        await prisma.ledgerEntry.create({
            data: { type: 'PURCHASE', quantity: 300, unitPrice: 320, totalAmount: 96000, description: 'Purchase of ARM Cortex M4 Chips', businessId: business.id, productId: product2.id, customerId: customer2.id, createdAt: new Date('2026-01-20') },
        });

        // Low stock product
        await prisma.inventoryLot.create({
            data: { lotNumber: 'LOT-DEMO-003', quantity: 100, remainingQty: 15, costPerUnit: 1200, businessId: business.id, productId: product3.id, receivedAt: new Date('2026-01-10') },
        });
        await prisma.inventoryUsage.create({
            data: { quantity: 85, reason: 'Assembly line A', businessId: business.id, productId: product3.id, createdAt: new Date('2026-02-01') },
        });

        // Packaging
        await prisma.inventoryLot.create({
            data: { lotNumber: 'LOT-DEMO-004', quantity: 500, remainingQty: 150, costPerUnit: 45, businessId: business.id, productId: product4.id, receivedAt: new Date('2026-01-05') },
        });
        await prisma.inventoryUsage.create({
            data: { quantity: 350, reason: 'Product packaging', businessId: business.id, productId: product4.id, createdAt: new Date('2026-02-10') },
        });

        // Capacitors - well stocked
        await prisma.inventoryLot.create({
            data: { lotNumber: 'LOT-DEMO-005', quantity: 1000, remainingQty: 750, costPerUnit: 15, businessId: business.id, productId: product5.id, receivedAt: new Date('2026-02-01') },
        });

        return NextResponse.json({ message: '✅ Seed complete! Login: rahul@acme.com / password123' });
    } catch (error: unknown) {
        console.error('Seed error:', error);
        return NextResponse.json({ error: 'Seed failed', details: String(error) }, { status: 500 });
    }
}
