import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getBillingUser } from '@/lib/billing';

// POST — join a business using an invite code
export async function POST(req: NextRequest) {
    const user = await getBillingUser(req);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code) {
        return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    // Find valid, unused invite code
    const invite = await prisma.inviteCode.findFirst({
        where: {
            code: code.toUpperCase(),
            usedBy: null,
            expiresAt: { gt: new Date() },
        },
        include: { business: true },
    });

    if (!invite) {
        return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 400 });
    }

    // Prevent joining your own business
    if (user.businessId === invite.businessId) {
        return NextResponse.json({ error: 'You are already a member of this business' }, { status: 400 });
    }

    // Update user to join the business and mark invite as used
    await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: {
                businessId: invite.businessId,
                role: 'MEMBER',
            },
        }),
        prisma.inviteCode.update({
            where: { id: invite.id },
            data: {
                usedBy: user.id,
                usedAt: new Date(),
            },
        }),
    ]);

    return NextResponse.json({
        message: `Successfully joined ${invite.business.name}`,
        businessId: invite.businessId,
        businessName: invite.business.name,
    });
}
