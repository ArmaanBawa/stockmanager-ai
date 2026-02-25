import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/helpers';

export async function GET() {
    const user = await getSessionUser();
    if (!user?.businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const products = await prisma.product.findMany({
        where: { businessId: user.businessId },
        include: { customer: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
    const user = await getSessionUser();
    if (!user?.businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await req.json();
    const product = await prisma.product.create({
        data: { ...data, businessId: user.businessId },
    });

    return NextResponse.json(product, { status: 201 });
}
