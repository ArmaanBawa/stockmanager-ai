import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/helpers';

export async function GET() {
    const user = await getSessionUser();
    if (!user?.businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const customers = await prisma.customer.findMany({
        where: { businessId: user.businessId },
        include: { _count: { select: { products: true, orders: true } } },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
    const user = await getSessionUser();
    if (!user?.businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await req.json();
    const customer = await prisma.customer.create({
        data: { ...data, businessId: user.businessId },
    });

    return NextResponse.json(customer, { status: 201 });
}
