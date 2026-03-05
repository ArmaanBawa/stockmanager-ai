import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireActiveSubscription } from '@/lib/billing';

// PATCH — change a member's role (owner-only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    const user = gate.user;
    const { userId } = await params;

    if (user.role !== 'OWNER') {
        return NextResponse.json({ error: 'Only owners can change roles' }, { status: 403 });
    }

    const { role } = await req.json();
    if (!['OWNER', 'MEMBER'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Verify target user is in the same business
    const target = await prisma.user.findFirst({
        where: { id: userId, businessId: user.businessId },
    });
    if (!target) {
        return NextResponse.json({ error: 'User not found in your business' }, { status: 404 });
    }

    // Prevent demoting the last owner
    if (target.role === 'OWNER' && role !== 'OWNER') {
        const ownerCount = await prisma.user.count({
            where: { businessId: user.businessId, role: 'OWNER' },
        });
        if (ownerCount <= 1) {
            return NextResponse.json({ error: 'Cannot demote the last owner. Promote another member first.' }, { status: 400 });
        }
    }

    await prisma.user.update({
        where: { id: userId },
        data: { role },
    });

    return NextResponse.json({ success: true, role });
}

// DELETE — remove a member from the business (owner-only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
    const gate = await requireActiveSubscription(req);
    if (!gate.ok) return gate.response;
    const user = gate.user;
    const { userId } = await params;

    if (user.role !== 'OWNER') {
        return NextResponse.json({ error: 'Only owners can remove members' }, { status: 403 });
    }

    if (userId === user.id) {
        return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 });
    }

    // Verify target user is in the same business
    const target = await prisma.user.findFirst({
        where: { id: userId, businessId: user.businessId },
    });
    if (!target) {
        return NextResponse.json({ error: 'User not found in your business' }, { status: 404 });
    }

    // Prevent removing the last owner
    if (target.role === 'OWNER') {
        const ownerCount = await prisma.user.count({
            where: { businessId: user.businessId, role: 'OWNER' },
        });
        if (ownerCount <= 1) {
            return NextResponse.json({ error: 'Cannot remove the last owner. Promote another member first.' }, { status: 400 });
        }
    }

    // Remove from business — create a new personal business for them
    const newBusiness = await prisma.business.create({
        data: { name: `${target.name}'s Business` },
    });

    await prisma.user.update({
        where: { id: userId },
        data: { businessId: newBusiness.id, role: 'OWNER' },
    });

    return NextResponse.json({ success: true });
}
