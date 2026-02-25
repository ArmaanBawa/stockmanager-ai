import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getSessionUser();
    if (!user?.businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const customer = await prisma.customer.findFirst({
        where: { id, businessId: user.businessId },
        include: { products: true, orders: { take: 5, orderBy: { createdAt: 'desc' } } },
    });

    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(customer);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getSessionUser();
    if (!user?.businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const data = await req.json();
    const customer = await prisma.customer.updateMany({
        where: { id, businessId: user.businessId },
        data,
    });

    if (customer.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getSessionUser();
    if (!user?.businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await prisma.customer.deleteMany({
        where: { id, businessId: user.businessId },
    });

    return NextResponse.json({ success: true });
}
