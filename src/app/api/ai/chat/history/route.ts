import { getSessionUser } from '@/lib/helpers';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET — load chat history for the logged-in user's business
export async function GET() {
    const user = await getSessionUser();
    if (!user?.businessId) return new Response('Unauthorized', { status: 401 });

    const messages = await prisma.chatMessage.findMany({
        where: { businessId: user.businessId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, role: true, content: true, createdAt: true },
    });

    return NextResponse.json(messages);
}

// DELETE — clear all chat history for the logged-in user's business
export async function DELETE() {
    const user = await getSessionUser();
    if (!user?.businessId) return new Response('Unauthorized', { status: 401 });

    await prisma.chatMessage.deleteMany({
        where: { businessId: user.businessId },
    });

    return NextResponse.json({ success: true });
}
