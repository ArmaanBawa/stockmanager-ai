import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireActiveSubscription } from '@/lib/billing';

export async function GET(req: NextRequest) {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    const user = gate.user;

    const customers = await prisma.customer.findMany({
        where: { businessId: user.businessId },
        include: { _count: { select: { products: true, orders: true } } },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    const user = gate.user;

    const data = await req.json();
    const customer = await prisma.customer.create({
        data: { ...data, businessId: user.businessId },
    });

    return NextResponse.json(customer, { status: 201 });
}
