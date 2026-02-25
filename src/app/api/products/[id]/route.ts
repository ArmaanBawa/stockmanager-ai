import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getSessionUser();
    if (!user?.businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const product = await prisma.product.findFirst({
        where: { id, businessId: user.businessId },
        include: { customer: true },
    });

    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(product);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getSessionUser();
    if (!user?.businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const data = await req.json();
    const product = await prisma.product.updateMany({
        where: { id, businessId: user.businessId },
        data,
    });

    if (product.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getSessionUser();
    if (!user?.businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await prisma.product.deleteMany({
        where: { id, businessId: user.businessId },
    });

    return NextResponse.json({ success: true });
}
