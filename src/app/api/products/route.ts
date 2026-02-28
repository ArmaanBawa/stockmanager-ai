import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireActiveSubscription } from '@/lib/billing';

export async function GET(req: NextRequest) {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    const user = gate.user;

    const products = await prisma.product.findMany({
        where: { businessId: user.businessId },
        include: { customer: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    const user = gate.user;

    const data = await req.json();
    const product = await prisma.product.create({
        data: { ...data, businessId: user.businessId },
    });

    return NextResponse.json(product, { status: 201 });
}
