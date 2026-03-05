import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireActiveSubscription } from '@/lib/billing';
import crypto from 'crypto';

// GET — list all team members
export async function GET(req: NextRequest) {
    try {
        const gate = await requireActiveSubscription(req);
        if (!gate.ok) return gate.response;
        const user = gate.user;

        const members = await prisma.user.findMany({
            where: { businessId: user.businessId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                image: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json(members);
    } catch (error) {
        console.error('[TEAM API] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST — generate invite code (owner-only)
export async function POST(req: NextRequest) {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    const user = gate.user;

    if (user.role !== 'OWNER') {
        return NextResponse.json({ error: 'Only owners can generate invite codes' }, { status: 403 });
    }

    // Generate a 6-character alphanumeric code
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();

    const inviteCode = await prisma.inviteCode.create({
        data: {
            code,
            businessId: user.businessId,
            createdBy: user.id,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
    });

    return NextResponse.json({
        code: inviteCode.code,
        expiresAt: inviteCode.expiresAt,
    }, { status: 201 });
}
