import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireActiveSubscription } from '@/lib/billing';

// GET — load chat history for the logged-in user's business
export async function GET(req: NextRequest) {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    const user = gate.user;

    const messages = await prisma.chatMessage.findMany({
        where: { businessId: user.businessId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, role: true, content: true, createdAt: true },
    });

    return NextResponse.json(messages);
}

// DELETE — clear all chat history for the logged-in user's business
export async function DELETE(req: NextRequest) {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    const user = gate.user;

    await prisma.chatMessage.deleteMany({
        where: { businessId: user.businessId },
    });

    return NextResponse.json({ success: true });
}
